-- Stark Prospecção · Etapa 2 · view de leads e funções de gravação de busca
-- Tudo em SECURITY INVOKER: o RLS do usuário continua valendo.

-- Lead + status do CRM + serviço da busca mais recente que o encontrou.
create view public.v_leads with (security_invoker = true) as
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
  ls.service as last_service
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

revoke all on public.v_leads from anon;
grant select on public.v_leads to authenticated;

-- Leads de uma busca (reabrir resultados do histórico sem chamar o Google).
create function public.get_search_leads(p_search_id uuid)
returns setof public.v_leads
language sql stable security invoker set search_path = '' as $$
  select v.*
  from public.v_leads v
  join public.search_leads sl on sl.lead_id = v.id
  where sl.search_id = p_search_id;
$$;

-- Grava uma busca nova: linha em searches + upsert dos leads + vínculos. Uma transação só.
-- No conflito, atualiza só os dados do Google (city/niche/first_seen_at e lead_status ficam intactos).
create function public.save_search_results(p_search jsonb, p_leads jsonb)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_search_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'não autenticado' using errcode = '42501';
  end if;
  if jsonb_typeof(p_leads) <> 'array' or jsonb_array_length(p_leads) > 1000 then
    raise exception 'lista de leads inválida' using errcode = '22023';
  end if;

  insert into public.searches (
    service, city, city_normalized, niche, show_all, lat, lng, radius_m,
    total_found, total_qualified, google_requests, from_cache
  ) values (
    p_search ->> 'service',
    p_search ->> 'city',
    p_search ->> 'city_normalized',
    p_search ->> 'niche',
    coalesce((p_search ->> 'show_all')::boolean, false),
    (p_search ->> 'lat')::double precision,
    (p_search ->> 'lng')::double precision,
    (p_search ->> 'radius_m')::integer,
    coalesce((p_search ->> 'total_found')::integer, 0),
    coalesce((p_search ->> 'total_qualified')::integer, 0),
    coalesce((p_search ->> 'google_requests')::integer, 0),
    false
  )
  returning id into v_search_id;

  with incoming as (
    select *
    from jsonb_to_recordset(p_leads) as x(
      place_id text, name text, address text,
      phone_national text, phone_e164 text, phone_type text,
      website text, website_kind text, rating numeric, reviews_count integer,
      opening_hours jsonb, types text[], primary_type text,
      lat double precision, lng double precision,
      google_maps_uri text, business_status text, city text, niche text
    )
  ),
  upserted as (
    insert into public.leads as l (
      place_id, name, address, phone_national, phone_e164, phone_type,
      website, website_kind, rating, reviews_count, opening_hours, types,
      primary_type, lat, lng, google_maps_uri, business_status, city, niche
    )
    select
      place_id, name, address, phone_national, phone_e164, coalesce(phone_type, 'nenhum'),
      website, coalesce(website_kind, 'nenhum'), rating, coalesce(reviews_count, 0), opening_hours,
      coalesce(types, '{}'), primary_type, lat, lng, google_maps_uri, business_status, city, niche
    from incoming
    on conflict (user_id, place_id) do update set
      name = excluded.name,
      address = excluded.address,
      phone_national = excluded.phone_national,
      phone_e164 = excluded.phone_e164,
      phone_type = excluded.phone_type,
      website = excluded.website,
      website_kind = excluded.website_kind,
      rating = excluded.rating,
      reviews_count = excluded.reviews_count,
      opening_hours = excluded.opening_hours,
      types = excluded.types,
      primary_type = excluded.primary_type,
      lat = excluded.lat,
      lng = excluded.lng,
      google_maps_uri = excluded.google_maps_uri,
      business_status = excluded.business_status,
      last_fetched_at = now()
    returning l.id
  )
  insert into public.search_leads (search_id, lead_id)
  select v_search_id, id from upserted
  on conflict do nothing;

  return v_search_id;
end $$;

-- Busca servida pelo cache: nova linha em searches (from_cache = true) apontando para a original,
-- com os mesmos vínculos. Nenhuma chamada ao Google.
create function public.clone_cached_search(
  p_source_id uuid,
  p_service text,
  p_city text,
  p_show_all boolean,
  p_total_qualified integer
)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
begin
  insert into public.searches (
    service, city, city_normalized, niche, show_all, lat, lng, radius_m,
    total_found, total_qualified, google_requests, from_cache, source_search_id
  )
  select p_service, p_city, s.city_normalized, s.niche, coalesce(p_show_all, false), s.lat, s.lng, s.radius_m,
         s.total_found, coalesce(p_total_qualified, 0), 0, true, coalesce(s.source_search_id, s.id)
  from public.searches s
  where s.id = p_source_id
  returning id into v_id;

  if v_id is null then
    raise exception 'busca de origem não encontrada' using errcode = 'P0002';
  end if;

  insert into public.search_leads (search_id, lead_id)
  select v_id, sl.lead_id from public.search_leads sl where sl.search_id = p_source_id
  on conflict do nothing;

  return v_id;
end $$;

revoke execute on function public.get_search_leads(uuid) from public, anon;
revoke execute on function public.save_search_results(jsonb, jsonb) from public, anon;
revoke execute on function public.clone_cached_search(uuid, text, text, boolean, integer) from public, anon;
grant execute on function public.get_search_leads(uuid) to authenticated;
grant execute on function public.save_search_results(jsonb, jsonb) to authenticated;
grant execute on function public.clone_cached_search(uuid, text, text, boolean, integer) to authenticated;
