/**
 * Edge Function "search-leads"
 * POST { service, city, niche, showAll, forceRefresh } com o JWT do usuário.
 * Responde { searchId, fromCache, lat, lng, radiusUsed, totalFound, googleRequests, leads }.
 * Filtro por serviço e score ficam no front, para o mesmo lead servir a serviços diferentes.
 */
import { authenticate, corsHeaders, errorResponse, HttpError, json } from "../_shared/http.ts";
import { getNiche, isNicheKey } from "../_shared/niches.ts";
import { passesServiceFilter, type QualifyInput } from "../_shared/qualify.ts";
import { isServiceKey, type ServiceKey } from "../_shared/services.ts";
import { normalizeCity } from "../_shared/text.ts";
import { createGoogleClient, GoogleError, type Geocoded } from "./google.ts";
import { collectPlaces, toLeadRow } from "./process.ts";

interface SearchInput {
  service: ServiceKey;
  city: string;
  niche: string;
  showAll: boolean;
  forceRefresh: boolean;
}

interface Settings {
  cache_days: number;
  min_reviews_busy: number;
}

const DEFAULT_SETTINGS: Settings = { cache_days: 30, min_reviews_busy: 50 };

function parseInput(body: unknown): SearchInput {
  if (!body || typeof body !== "object") throw new HttpError("INVALID_INPUT");
  const b = body as Record<string, unknown>;
  const city = typeof b.city === "string" ? b.city.replace(/\s+/g, " ").trim() : "";
  if (!isServiceKey(b.service)) throw new HttpError("INVALID_INPUT", "Escolha um serviço válido.");
  if (!isNicheKey(b.niche)) throw new HttpError("INVALID_INPUT", "Escolha um nicho válido.");
  if (city.length < 2 || city.length > 80) throw new HttpError("INVALID_INPUT", "A cidade precisa ter entre 2 e 80 caracteres.");
  return { service: b.service, city, niche: b.niche, showAll: b.showAll === true, forceRefresh: b.forceRefresh === true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("METHOD_NOT_ALLOWED");

  const started = Date.now();
  try {
    const { supabase } = await authenticate(req);
    const input = parseInput(await req.json().catch(() => null));
    const cityNormalized = normalizeCity(input.city);
    const niche = getNiche(input.niche)!;

    const { data: settingsRow } = await supabase.from("user_settings").select("cache_days, min_reviews_busy").maybeSingle();
    const settings: Settings = { ...DEFAULT_SETTINGS, ...(settingsRow ?? {}) };
    const qualifyOpts = { minReviewsBusy: settings.min_reviews_busy };

    // b) Cache: mesma cidade + nicho dentro de cache_days → não chama o Google.
    if (!input.forceRefresh) {
      const since = new Date(Date.now() - settings.cache_days * 86_400_000).toISOString();
      const { data: cached, error: cacheErr } = await supabase
        .from("searches")
        .select("id, lat, lng, radius_m, total_found, created_at")
        .eq("city_normalized", cityNormalized)
        .eq("niche", input.niche)
        .eq("from_cache", false)
        .gt("total_found", 0)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cacheErr) throw cacheErr;

      if (cached) {
        const { data: leads, error: leadsErr } = await supabase.rpc("get_search_leads", { p_search_id: cached.id });
        if (leadsErr) throw leadsErr;
        const cachedLeads = (leads ?? []) as QualifyInput[];
        const qualified = cachedLeads.filter((l) => passesServiceFilter(l, input.service, qualifyOpts)).length;
        const { data: newId, error: cloneErr } = await supabase.rpc("clone_cached_search", {
          p_source_id: cached.id,
          p_service: input.service,
          p_city: input.city,
          p_show_all: input.showAll,
          p_total_qualified: qualified,
        });
        if (cloneErr) throw cloneErr;
        console.log(`[search-leads] cache ${cityNormalized}/${input.niche} → ${leads?.length ?? 0} leads em ${Date.now() - started}ms`);
        return json({
          searchId: newId,
          fromCache: true,
          cachedAt: cached.created_at,
          lat: cached.lat,
          lng: cached.lng,
          radiusUsed: cached.radius_m,
          totalFound: leads?.length ?? 0,
          googleRequests: 0,
          leads: leads ?? [],
        });
      }
    }

    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!apiKey) {
      console.error("[search-leads] secret GOOGLE_MAPS_API_KEY ausente");
      throw new HttpError("GOOGLE_AUTH");
    }
    const google = createGoogleClient(apiKey);

    // c) Geocoding com cache por usuário.
    let center: Geocoded;
    const { data: geo } = await supabase
      .from("geocode_cache")
      .select("lat, lng, formatted_address")
      .eq("city_normalized", cityNormalized)
      .maybeSingle();
    if (geo) {
      center = { lat: geo.lat, lng: geo.lng, formattedAddress: geo.formatted_address ?? input.city };
    } else {
      center = await google.geocode(input.city);
      const { error: geoErr } = await supabase.from("geocode_cache").upsert(
        { city_normalized: cityNormalized, lat: center.lat, lng: center.lng, formatted_address: center.formattedAddress },
        { onConflict: "user_id,city_normalized" },
      );
      if (geoErr) console.error("[search-leads] falha ao salvar geocode_cache", geoErr);
    }

    // d–f) Text Search com raio progressivo + pós-processamento.
    const { places, radiusUsed } = await collectPlaces(google, { keywords: niche.keywords, city: input.city, center });
    const rows = places.map((p) => toLeadRow(p, { city: input.city, niche: input.niche })).filter((r) => r.name);
    const qualified = rows.filter((r) => passesServiceFilter(r, input.service, qualifyOpts)).length;

    // g–h) Grava busca + leads + vínculos numa transação (RPC com o RLS do usuário).
    const { data: searchId, error: saveErr } = await supabase.rpc("save_search_results", {
      p_search: {
        service: input.service,
        city: input.city,
        city_normalized: cityNormalized,
        niche: input.niche,
        show_all: input.showAll,
        lat: center.lat,
        lng: center.lng,
        radius_m: radiusUsed,
        total_found: rows.length,
        total_qualified: qualified,
        google_requests: google.requests,
      },
      p_leads: rows,
    });
    if (saveErr) throw saveErr;

    console.log(`[search-leads] google ${cityNormalized}/${input.niche} → ${rows.length} leads, ${google.requests} req, raio ${radiusUsed}m, ${Date.now() - started}ms`);
    if (rows.length === 0) throw new HttpError("NO_RESULTS");

    const { data: leads, error: leadsErr } = await supabase.rpc("get_search_leads", { p_search_id: searchId });
    if (leadsErr) throw leadsErr;

    return json({
      searchId,
      fromCache: false,
      cachedAt: null,
      lat: center.lat,
      lng: center.lng,
      radiusUsed,
      totalFound: rows.length,
      googleRequests: google.requests,
      leads: leads ?? [],
    });
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.code, err.message);
    if (err instanceof GoogleError) {
      console.error(`[search-leads] google ${err.code}: ${err.message}`);
      return errorResponse(err.code);
    }
    console.error("[search-leads] erro inesperado", err);
    return errorResponse("INTERNAL");
  }
});
