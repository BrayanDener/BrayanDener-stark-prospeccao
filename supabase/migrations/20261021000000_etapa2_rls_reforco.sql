-- Stark Prospecção · Etapa 2 · reforço de RLS
-- Chaves estrangeiras não passam pelo RLS: sem isto, um usuário poderia vincular à própria busca
-- (ou registrar status/atividade para) um lead de outra conta. Agora a linha referenciada também
-- precisa ser do próprio usuário.

alter policy "search_leads: inserir os próprios" on public.search_leads
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.searches s where s.id = search_id and s.user_id = (select auth.uid()))
    and exists (select 1 from public.leads l where l.id = lead_id and l.user_id = (select auth.uid()))
  );
alter policy "search_leads: atualizar os próprios" on public.search_leads
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.searches s where s.id = search_id and s.user_id = (select auth.uid()))
    and exists (select 1 from public.leads l where l.id = lead_id and l.user_id = (select auth.uid()))
  );

alter policy "lead_status: inserir os próprios" on public.lead_status
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.leads l where l.id = lead_id and l.user_id = (select auth.uid()))
  );
alter policy "lead_status: atualizar os próprios" on public.lead_status
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.leads l where l.id = lead_id and l.user_id = (select auth.uid()))
  );

alter policy "lead_activities: inserir os próprios" on public.lead_activities
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.leads l where l.id = lead_id and l.user_id = (select auth.uid()))
  );
alter policy "lead_activities: atualizar os próprios" on public.lead_activities
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.leads l where l.id = lead_id and l.user_id = (select auth.uid()))
  );

-- searches.source_search_id também precisa apontar para uma busca do próprio usuário.
alter policy "searches: inserir os próprios" on public.searches
  with check (
    (select auth.uid()) = user_id
    and (
      source_search_id is null
      or exists (select 1 from public.searches s where s.id = source_search_id and s.user_id = (select auth.uid()))
    )
  );
