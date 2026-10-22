-- Stark Prospecção · Etapa 2 · correção de save_search_results
-- Numa única instrução com CTE de escrita, os leads recém-inseridos não aparecem para a política de
-- search_leads (que confere se o lead é do usuário). Agora são dois passos na mesma transação:
-- 1) upsert dos leads guardando os ids; 2) vínculos com a busca.
create or replace function public.save_search_results(p_search jsonb, p_leads jsonb)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_search_id uuid;
  v_lead_ids uuid[];
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

  -- 1) upsert dos leads (no conflito, só os dados do Google mudam)
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
  select coalesce(array_agg(id), '{}') into v_lead_ids from upserted;

  -- 2) vínculos busca ↔ leads
  insert into public.search_leads (search_id, lead_id)
  select v_search_id, unnest(v_lead_ids)
  on conflict do nothing;

  return v_search_id;
end $$;
