-- Stark Prospecção · Etapa 2 · esquema base
-- Todas as tabelas têm RLS: cada usuário só enxerga as próprias linhas (user_id = auth.uid()).

create table public.searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  service text not null check (service in ('sites','marketing','automacoes','apps','design','outro')),
  city text not null check (char_length(city) between 2 and 80),
  city_normalized text not null,
  niche text not null check (niche in ('restaurantes','saloes','barbearias','oficinas','estetica_automotiva','clinicas','dentistas','academias','farmacias','hoteis','supermercados','padarias','bares','escolas','advocacia','contabilidades','lojas_roupa','construcao','pet_shops','imobiliarias')),
  show_all boolean not null default false,
  lat double precision,
  lng double precision,
  radius_m integer,
  total_found integer not null default 0,
  total_qualified integer not null default 0,
  google_requests integer not null default 0,
  from_cache boolean not null default false,
  -- quando from_cache = true: a busca original cujos resultados foram reaproveitados
  source_search_id uuid references public.searches (id) on delete set null,
  created_at timestamptz not null default now()
);
create index searches_user_created_idx on public.searches (user_id, created_at desc);
create index searches_cache_lookup_idx on public.searches (user_id, city_normalized, niche, created_at desc);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  place_id text not null,
  name text not null,
  address text,
  phone_national text,
  phone_e164 text,
  phone_type text not null default 'nenhum' check (phone_type in ('celular', 'fixo', 'nenhum')),
  website text,
  website_kind text not null default 'nenhum' check (website_kind in ('nenhum', 'rede_social', 'site')),
  rating numeric(2, 1) check (rating between 0 and 5),
  reviews_count integer not null default 0,
  opening_hours jsonb,
  types text[] not null default '{}',
  primary_type text,
  lat double precision,
  lng double precision,
  google_maps_uri text,
  business_status text,
  city text not null,
  niche text not null check (niche in ('restaurantes','saloes','barbearias','oficinas','estetica_automotiva','clinicas','dentistas','academias','farmacias','hoteis','supermercados','padarias','bares','escolas','advocacia','contabilidades','lojas_roupa','construcao','pet_shops','imobiliarias')),
  first_seen_at timestamptz not null default now(),
  last_fetched_at timestamptz not null default now(),
  constraint leads_user_place_unique unique (user_id, place_id)
);
create index leads_user_city_niche_idx on public.leads (user_id, city, niche);

create table public.search_leads (
  search_id uuid not null references public.searches (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  primary key (search_id, lead_id)
);
create index search_leads_lead_idx on public.search_leads (lead_id);
create index search_leads_user_idx on public.search_leads (user_id);

create table public.lead_status (
  lead_id uuid primary key references public.leads (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status text not null default 'novo' check (status in ('novo','contatado','respondeu','negociando','fechado','sem_interesse')),
  notes text not null default '',
  last_contact_at timestamptz,
  replied_at timestamptz,
  follow_up_at timestamptz,
  updated_at timestamptz not null default now()
);
create index lead_status_user_status_idx on public.lead_status (user_id, status);
create index lead_status_user_followup_idx on public.lead_status (user_id, follow_up_at);

create table public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  type text not null check (type in ('status', 'whatsapp', 'ligacao', 'nota', 'followup')),
  description text not null default '',
  created_at timestamptz not null default now()
);
create index lead_activities_lead_idx on public.lead_activities (lead_id, created_at desc);
create index lead_activities_user_idx on public.lead_activities (user_id);

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  service text not null check (service in ('sites','marketing','automacoes','apps','design','outro')),
  niche text check (niche is null or niche in ('restaurantes','saloes','barbearias','oficinas','estetica_automotiva','clinicas','dentistas','academias','farmacias','hoteis','supermercados','padarias','bares','escolas','advocacia','contabilidades','lojas_roupa','construcao','pet_shops','imobiliarias')),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 2000),
  is_default boolean not null default false,
  updated_at timestamptz not null default now(),
  -- um modelo por serviço (niche nulo) e no máximo um por serviço + nicho
  constraint message_templates_unique unique nulls not distinct (user_id, service, niche)
);

create table public.geocode_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  city_normalized text not null,
  lat double precision not null,
  lng double precision not null,
  formatted_address text,
  created_at timestamptz not null default now(),
  constraint geocode_cache_unique unique (user_id, city_normalized)
);

create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  cache_days integer not null default 30 check (cache_days between 1 and 365),
  min_reviews_busy integer not null default 50 check (min_reviews_busy between 0 and 100000),
  followup_days integer not null default 3 check (followup_days between 1 and 90),
  hide_contacted boolean not null default true,
  signature text not null default '[Seu nome], da Stark IA' check (char_length(signature) between 1 and 120),
  updated_at timestamptz not null default now()
);

-- updated_at automático
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger lead_status_updated_at before update on public.lead_status for each row execute function public.set_updated_at();
create trigger message_templates_updated_at before update on public.message_templates for each row execute function public.set_updated_at();
create trigger user_settings_updated_at before update on public.user_settings for each row execute function public.set_updated_at();

-- Todo lead novo ganha uma linha 'novo' em lead_status (roda como o próprio usuário: o RLS vale).
create function public.create_lead_status() returns trigger
language plpgsql set search_path = '' as $$
begin
  insert into public.lead_status (lead_id, user_id) values (new.id, new.user_id) on conflict (lead_id) do nothing;
  return new;
end $$;

create trigger leads_create_status after insert on public.leads for each row execute function public.create_lead_status();

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.create_lead_status() from public, anon, authenticated;

-- RLS + permissões da API (só usuários autenticados; anon não lê nada)

alter table public.searches enable row level security;
create policy "searches: ler os próprios" on public.searches for select to authenticated using ((select auth.uid()) = user_id);
create policy "searches: inserir os próprios" on public.searches for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "searches: atualizar os próprios" on public.searches for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "searches: apagar os próprios" on public.searches for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.searches from anon;
grant select, insert, update, delete on public.searches to authenticated;

alter table public.leads enable row level security;
create policy "leads: ler os próprios" on public.leads for select to authenticated using ((select auth.uid()) = user_id);
create policy "leads: inserir os próprios" on public.leads for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "leads: atualizar os próprios" on public.leads for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "leads: apagar os próprios" on public.leads for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.leads from anon;
grant select, insert, update, delete on public.leads to authenticated;

alter table public.search_leads enable row level security;
create policy "search_leads: ler os próprios" on public.search_leads for select to authenticated using ((select auth.uid()) = user_id);
create policy "search_leads: inserir os próprios" on public.search_leads for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "search_leads: atualizar os próprios" on public.search_leads for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "search_leads: apagar os próprios" on public.search_leads for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.search_leads from anon;
grant select, insert, update, delete on public.search_leads to authenticated;

alter table public.lead_status enable row level security;
create policy "lead_status: ler os próprios" on public.lead_status for select to authenticated using ((select auth.uid()) = user_id);
create policy "lead_status: inserir os próprios" on public.lead_status for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "lead_status: atualizar os próprios" on public.lead_status for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "lead_status: apagar os próprios" on public.lead_status for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.lead_status from anon;
grant select, insert, update, delete on public.lead_status to authenticated;

alter table public.lead_activities enable row level security;
create policy "lead_activities: ler os próprios" on public.lead_activities for select to authenticated using ((select auth.uid()) = user_id);
create policy "lead_activities: inserir os próprios" on public.lead_activities for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "lead_activities: atualizar os próprios" on public.lead_activities for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "lead_activities: apagar os próprios" on public.lead_activities for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.lead_activities from anon;
grant select, insert, update, delete on public.lead_activities to authenticated;

alter table public.message_templates enable row level security;
create policy "message_templates: ler os próprios" on public.message_templates for select to authenticated using ((select auth.uid()) = user_id);
create policy "message_templates: inserir os próprios" on public.message_templates for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "message_templates: atualizar os próprios" on public.message_templates for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "message_templates: apagar os próprios" on public.message_templates for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.message_templates from anon;
grant select, insert, update, delete on public.message_templates to authenticated;

alter table public.geocode_cache enable row level security;
create policy "geocode_cache: ler os próprios" on public.geocode_cache for select to authenticated using ((select auth.uid()) = user_id);
create policy "geocode_cache: inserir os próprios" on public.geocode_cache for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "geocode_cache: atualizar os próprios" on public.geocode_cache for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "geocode_cache: apagar os próprios" on public.geocode_cache for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.geocode_cache from anon;
grant select, insert, update, delete on public.geocode_cache to authenticated;

alter table public.user_settings enable row level security;
create policy "user_settings: ler os próprios" on public.user_settings for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_settings: inserir os próprios" on public.user_settings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_settings: atualizar os próprios" on public.user_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_settings: apagar os próprios" on public.user_settings for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.user_settings from anon;
grant select, insert, update, delete on public.user_settings to authenticated;
