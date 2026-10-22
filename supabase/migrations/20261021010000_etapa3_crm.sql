-- Stark Prospecção · Etapa 3 · CRM, contato pelo WhatsApp e métricas
-- Funções em SECURITY INVOKER (o RLS do usuário vale). Cada ação devolve o estado anterior para o "Desfazer".

alter table public.lead_status add column if not exists closed_at timestamptz;
create index if not exists lead_status_user_closed_idx on public.lead_status (user_id, closed_at);

-- A view ganha closed_at (coluna nova sempre no fim).
create or replace view public.v_leads with (security_invoker = true) as
select
  l.id, l.user_id, l.place_id, l.name, l.address,
  l.phone_national, l.phone_e164, l.phone_type,
  l.website, l.website_kind, l.rating, l.reviews_count,
  l.opening_hours, l.types, l.primary_type, l.lat, l.lng,
  l.google_maps_uri, l.business_status, l.city, l.niche,
  l.first_seen_at, l.last_fetched_at,
  coalesce(s.status, 'novo') as status,
  coalesce(s.notes, '') as notes,
  s.last_contact_at, s.replied_at, s.follow_up_at,
  s.updated_at as status_updated_at,
  ls.service as last_service,
  s.closed_at
from public.leads l
left join public.lead_status s on s.lead_id = l.id
left join lateral (
  select se.service
  from public.search_leads sl
  join public.searches se on se.id = sl.search_id
  where sl.lead_id = l.id
  order by se.created_at desc
  limit 1
) ls on true;

-- Rótulo do status para o texto das atividades ("Novo → Contatado").
create or replace function public.status_label(p_status text)
returns text language sql immutable set search_path = '' as $$
  select case p_status
    when 'novo' then 'Novo'
    when 'contatado' then 'Contatado'
    when 'respondeu' then 'Respondeu'
    when 'negociando' then 'Negociando'
    when 'fechado' then 'Fechado'
    when 'sem_interesse' then 'Sem interesse'
    else p_status
  end;
$$;

-- Dias de follow-up configurados (padrão 3).
create or replace function public.followup_days()
returns integer language sql stable security invoker set search_path = '' as $$
  select coalesce((select followup_days from public.user_settings where user_id = (select auth.uid())), 3);
$$;

-- Mudança de status (menu, detalhe, Kanban).
-- Sair de 'novo' marca o primeiro contato; respondeu/negociando/fechado marcam replied_at na 1ª vez;
-- fechado guarda closed_at; fechado/sem interesse limpam o follow-up; contatado agenda follow-up se vazio.
create or replace function public.set_lead_status(p_lead_id uuid, p_status text)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_prev public.lead_status;
  v_now timestamptz := now();
  v_act uuid;
begin
  if p_status not in ('novo', 'contatado', 'respondeu', 'negociando', 'fechado', 'sem_interesse') then
    raise exception 'status inválido' using errcode = '22023';
  end if;
  select * into v_prev from public.lead_status where lead_id = p_lead_id for update;
  if not found then
    raise exception 'lead não encontrado' using errcode = 'P0002';
  end if;
  if v_prev.status = p_status then
    return jsonb_build_object('previous', to_jsonb(v_prev), 'activity_ids', '[]'::jsonb, 'changed', false);
  end if;

  update public.lead_status set
    status = p_status,
    last_contact_at = case when p_status <> 'novo' then coalesce(last_contact_at, v_now) else last_contact_at end,
    replied_at = case when p_status in ('respondeu', 'negociando', 'fechado') then coalesce(replied_at, v_now) else replied_at end,
    closed_at = case when p_status = 'fechado' then coalesce(closed_at, v_now) else null end,
    follow_up_at = case
      when p_status in ('fechado', 'sem_interesse') then null
      when p_status = 'contatado' and follow_up_at is null then v_now + make_interval(days => public.followup_days())
      else follow_up_at
    end
  where lead_id = p_lead_id;

  insert into public.lead_activities (lead_id, type, description)
  values (p_lead_id, 'status', public.status_label(v_prev.status) || ' → ' || public.status_label(p_status))
  returning id into v_act;

  return jsonb_build_object('previous', to_jsonb(v_prev), 'activity_ids', jsonb_build_array(v_act), 'changed', true);
end $$;

-- Contato registrado ao abrir o WhatsApp ou ligar.
-- WhatsApp: 'novo' → 'contatado' (nunca regride), último contato = agora, follow-up se vazio, atividade com o texto.
-- Ligação: atividade + último contato.
create or replace function public.register_contact(p_lead_id uuid, p_channel text, p_message text default null)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_prev public.lead_status;
  v_now timestamptz := now();
  v_ids uuid[] := '{}';
  v_act uuid;
begin
  if p_channel not in ('whatsapp', 'ligacao') then
    raise exception 'canal inválido' using errcode = '22023';
  end if;
  select * into v_prev from public.lead_status where lead_id = p_lead_id for update;
  if not found then
    raise exception 'lead não encontrado' using errcode = 'P0002';
  end if;

  if p_channel = 'whatsapp' then
    update public.lead_status set
      status = case when status = 'novo' then 'contatado' else status end,
      last_contact_at = v_now,
      follow_up_at = coalesce(follow_up_at, v_now + make_interval(days => public.followup_days()))
    where lead_id = p_lead_id;

    insert into public.lead_activities (lead_id, type, description)
    values (p_lead_id, 'whatsapp', left(coalesce(nullif(trim(p_message), ''), 'Mensagem enviada pelo WhatsApp'), 2000))
    returning id into v_act;
    v_ids := v_ids || v_act;

    if v_prev.status = 'novo' then
      insert into public.lead_activities (lead_id, type, description)
      values (p_lead_id, 'status', 'Novo → Contatado')
      returning id into v_act;
      v_ids := v_ids || v_act;
    end if;
  else
    update public.lead_status set last_contact_at = v_now where lead_id = p_lead_id;
    insert into public.lead_activities (lead_id, type, description)
    values (p_lead_id, 'ligacao', 'Ligação pelo app')
    returning id into v_act;
    v_ids := v_ids || v_act;
  end if;

  return jsonb_build_object('previous', to_jsonb(v_prev), 'activity_ids', to_jsonb(v_ids), 'changed', true);
end $$;

-- "Desfazer": volta status e datas ao estado anterior. As atividades criadas pela ação são
-- removidas pelo app (DELETE em lead_activities, permitido só ao dono pelo RLS).
create or replace function public.restore_lead_state(p_lead_id uuid, p_previous jsonb)
returns void
language plpgsql security invoker set search_path = '' as $$
begin
  update public.lead_status set
    status = p_previous ->> 'status',
    last_contact_at = (p_previous ->> 'last_contact_at')::timestamptz,
    replied_at = (p_previous ->> 'replied_at')::timestamptz,
    follow_up_at = (p_previous ->> 'follow_up_at')::timestamptz,
    closed_at = (p_previous ->> 'closed_at')::timestamptz
  where lead_id = p_lead_id;
  if not found then
    raise exception 'lead não encontrado' using errcode = 'P0002';
  end if;
end $$;

-- Agenda (ou limpa, com null) o próximo follow-up.
create or replace function public.set_follow_up(p_lead_id uuid, p_at timestamptz)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_prev public.lead_status;
  v_act uuid;
begin
  select * into v_prev from public.lead_status where lead_id = p_lead_id for update;
  if not found then
    raise exception 'lead não encontrado' using errcode = 'P0002';
  end if;
  update public.lead_status set follow_up_at = p_at where lead_id = p_lead_id;
  insert into public.lead_activities (lead_id, type, description)
  values (
    p_lead_id, 'followup',
    case when p_at is null then 'Follow-up removido'
         else 'Follow-up agendado para ' || to_char(p_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY') end
  )
  returning id into v_act;
  return jsonb_build_object('previous', to_jsonb(v_prev), 'activity_ids', jsonb_build_array(v_act), 'changed', true);
end $$;

-- Concluir follow-up: limpa a data e registra a atividade.
create or replace function public.complete_follow_up(p_lead_id uuid)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_prev public.lead_status;
  v_act uuid;
begin
  select * into v_prev from public.lead_status where lead_id = p_lead_id for update;
  if not found then
    raise exception 'lead não encontrado' using errcode = 'P0002';
  end if;
  update public.lead_status set follow_up_at = null where lead_id = p_lead_id;
  insert into public.lead_activities (lead_id, type, description)
  values (p_lead_id, 'followup', 'Follow-up concluído')
  returning id into v_act;
  return jsonb_build_object('previous', to_jsonb(v_prev), 'activity_ids', jsonb_build_array(v_act), 'changed', true);
end $$;

-- Métricas do Dashboard calculadas no banco (sem baixar leads para contar no front). Fuso: America/Sao_Paulo.
create or replace function public.dashboard_summary()
returns jsonb
language sql stable security invoker set search_path = '' as $$
  with bounds as (
    select
      (date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo') as today_start,
      (date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo') + interval '1 day' as tomorrow_start,
      (date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo') as month_start
  ),
  st as (
    select s.status, s.last_contact_at, s.replied_at, s.closed_at, s.follow_up_at from public.lead_status s
  )
  select jsonb_build_object(
    'total_leads', (select count(*) from public.leads),
    'contacted', (select count(*) from st where last_contact_at is not null),
    'replied', (select count(*) from st where replied_at is not null),
    'negotiating', (select count(*) from st where status = 'negociando'),
    'closed', (select count(*) from st where status = 'fechado'),
    'closed_this_month', (select count(*) from st, bounds b where status = 'fechado' and closed_at >= b.month_start),
    'followups_due', (select count(*) from st, bounds b where follow_up_at < b.tomorrow_start),
    'followups_overdue', (select count(*) from st, bounds b where follow_up_at < b.today_start),
    'funnel', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) as n from st group by status) f), '{}'::jsonb),
    'google_requests_month', (select coalesce(sum(google_requests), 0) from public.searches, bounds b where created_at >= b.month_start),
    'searches_month', (select count(*) from public.searches, bounds b where created_at >= b.month_start and not from_cache),
    'today_start', (select today_start from bounds),
    'tomorrow_start', (select tomorrow_start from bounds)
  );
$$;

-- Follow-ups de hoje + atrasados (fuso America/Sao_Paulo), mais antigos primeiro.
create or replace function public.due_followups(p_limit integer default 50)
returns setof public.v_leads
language sql stable security invoker set search_path = '' as $$
  select v.*
  from public.v_leads v
  where v.follow_up_at < (date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo') + interval '1 day'
  order by v.follow_up_at asc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;

-- Primeiro login: cria user_settings e os modelos padrão (textos vêm de src/lib/messages.ts) se não existirem.
create or replace function public.ensure_user_setup(p_templates jsonb default '[]'::jsonb)
returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    raise exception 'não autenticado' using errcode = '42501';
  end if;
  insert into public.user_settings (user_id) values ((select auth.uid())) on conflict (user_id) do nothing;
  insert into public.message_templates (service, niche, title, body, is_default)
  select t.service, null, t.title, t.body, true
  from jsonb_to_recordset(coalesce(p_templates, '[]'::jsonb)) as t(service text, title text, body text)
  on conflict (user_id, service, niche) do nothing;
end $$;

revoke execute on function public.status_label(text) from public, anon;
revoke execute on function public.followup_days() from public, anon;
revoke execute on function public.set_lead_status(uuid, text) from public, anon;
revoke execute on function public.register_contact(uuid, text, text) from public, anon;
revoke execute on function public.restore_lead_state(uuid, jsonb) from public, anon;
revoke execute on function public.set_follow_up(uuid, timestamptz) from public, anon;
revoke execute on function public.complete_follow_up(uuid) from public, anon;
revoke execute on function public.dashboard_summary() from public, anon;
revoke execute on function public.due_followups(integer) from public, anon;
revoke execute on function public.ensure_user_setup(jsonb) from public, anon;

grant execute on function public.status_label(text) to authenticated;
grant execute on function public.followup_days() to authenticated;
grant execute on function public.set_lead_status(uuid, text) to authenticated;
grant execute on function public.register_contact(uuid, text, text) to authenticated;
grant execute on function public.restore_lead_state(uuid, jsonb) to authenticated;
grant execute on function public.set_follow_up(uuid, timestamptz) to authenticated;
grant execute on function public.complete_follow_up(uuid) to authenticated;
grant execute on function public.dashboard_summary() to authenticated;
grant execute on function public.due_followups(integer) to authenticated;
grant execute on function public.ensure_user_setup(jsonb) to authenticated;
