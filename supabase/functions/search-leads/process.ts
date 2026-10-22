/**
 * Busca com raio progressivo + pós-processamento dos resultados do Google em linhas de `leads`.
 * Funções puras (exceto collectPlaces, que só usa o cliente injetado), testáveis fora do Supabase.
 */
import { normalizePhone, phoneType, toE164, type PhoneType } from "../_shared/phone.ts";
import { classifyWebsite, type WebsiteKind } from "../_shared/website.ts";
import type { GoogleClient, GooglePlace, LatLng } from "./google.ts";

/** Raios tentados em ordem (m). Para no primeiro que der MIN_RESULTS empresas. */
export const RADII_M = [8_000, 20_000, 40_000] as const;
export const MIN_RESULTS = 15;
export const MAX_KEYWORDS = 4;
export const MAX_PAGES = 3;
/** O locationBias só prioriza; descartamos o que estiver além de raio + 5 km. */
export const DISTANCE_MARGIN_M = 5_000;

export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function placeLatLng(p: GooglePlace): LatLng | null {
  const lat = p.location?.latitude;
  const lng = p.location?.longitude;
  return typeof lat === "number" && typeof lng === "number" ? { lat, lng } : null;
}

/** Operando e dentro de raio + margem. Sem businessStatus = considera operando. */
export function isUsablePlace(p: GooglePlace, center: LatLng, radiusM: number): boolean {
  if (!p.id || !p.displayName?.text) return false;
  if (p.businessStatus && p.businessStatus !== "OPERATIONAL") return false;
  const loc = placeLatLng(p);
  if (!loc) return false;
  return haversineMeters(center, loc) <= radiusM + DISTANCE_MARGIN_M;
}

export interface CollectResult {
  places: GooglePlace[];
  radiusUsed: number;
}

/**
 * Para cada raio: todas as palavras-chave (em paralelo), até 3 páginas cada.
 * Limite: 4 palavras × 3 páginas × 3 raios = 36 requisições de Text Search.
 */
export async function collectPlaces(
  google: Pick<GoogleClient, "textSearch">,
  input: { keywords: readonly string[]; city: string; center: LatLng },
): Promise<CollectResult> {
  const found = new Map<string, GooglePlace>();
  const keywords = input.keywords.slice(0, MAX_KEYWORDS);
  let radiusUsed: number = RADII_M[0];

  for (const radius of RADII_M) {
    radiusUsed = radius;
    await Promise.all(
      keywords.map(async (keyword) => {
        let pageToken: string | undefined;
        for (let page = 0; page < MAX_PAGES; page++) {
          const res = await google.textSearch({ textQuery: `${keyword} em ${input.city}`, center: input.center, radiusM: radius, pageToken });
          for (const place of res.places) if (place.id && !found.has(place.id)) found.set(place.id, place);
          pageToken = res.nextPageToken;
          if (!pageToken) break;
        }
      }),
    );
    const usable = [...found.values()].filter((p) => isUsablePlace(p, input.center, radius));
    if (usable.length >= MIN_RESULTS) break;
  }

  return { places: [...found.values()].filter((p) => isUsablePlace(p, input.center, radiusUsed)), radiusUsed };
}

export interface LeadRow {
  place_id: string;
  name: string;
  address: string | null;
  phone_national: string | null;
  phone_e164: string | null;
  phone_type: PhoneType;
  website: string | null;
  website_kind: WebsiteKind;
  rating: number | null;
  reviews_count: number;
  opening_hours: { periods: unknown[]; weekdayDescriptions: string[] } | null;
  types: string[];
  primary_type: string | null;
  lat: number | null;
  lng: number | null;
  google_maps_uri: string | null;
  business_status: string | null;
  city: string;
  niche: string;
}

export function toLeadRow(p: GooglePlace, ctx: { city: string; niche: string }): LeadRow {
  const rawPhone = p.internationalPhoneNumber ?? p.nationalPhoneNumber ?? null;
  const normalized = normalizePhone(rawPhone);
  const loc = placeLatLng(p);
  const website = p.websiteUri?.trim() || null;
  const rating = typeof p.rating === "number" ? Math.round(p.rating * 10) / 10 : null;
  return {
    place_id: p.id,
    name: p.displayName?.text?.trim() ?? "",
    address: p.formattedAddress ?? null,
    phone_national: p.nationalPhoneNumber ?? (normalized ? normalized : null),
    phone_e164: toE164(rawPhone),
    phone_type: phoneType(rawPhone),
    website,
    website_kind: classifyWebsite(website),
    rating,
    reviews_count: p.userRatingCount ?? 0,
    opening_hours: p.regularOpeningHours
      ? { periods: p.regularOpeningHours.periods ?? [], weekdayDescriptions: p.regularOpeningHours.weekdayDescriptions ?? [] }
      : null,
    types: p.types ?? [],
    primary_type: p.primaryType ?? null,
    lat: loc?.lat ?? null,
    lng: loc?.lng ?? null,
    google_maps_uri: p.googleMapsUri ?? null,
    business_status: p.businessStatus ?? null,
    city: ctx.city,
    niche: ctx.niche,
  };
}
