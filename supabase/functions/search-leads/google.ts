/**
 * Cliente mínimo das APIs do Google usadas pela busca:
 * - Geocoding API (centro da cidade)
 * - Places API (New) · Text Search
 * Conta cada requisição (inclusive novas tentativas) para o controle de consumo.
 */

export type GoogleErrorCode = "CITY_NOT_FOUND" | "GOOGLE_QUOTA" | "GOOGLE_AUTH" | "GOOGLE_UNAVAILABLE";

export class GoogleError extends Error {
  constructor(
    public code: GoogleErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "GoogleError";
  }
}

/**
 * Field mask fixo e enxuto. Não adicionar fotos, reviews ou outros campos:
 * cada campo pode mudar a faixa de cobrança do Google.
 */
export const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.regularOpeningHours",
  "places.types",
  "places.primaryType",
  "places.location",
  "places.googleMapsUri",
  "places.businessStatus",
  "nextPageToken",
].join(",");

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Geocoded extends LatLng {
  formattedAddress: string;
}

export interface GooglePlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  regularOpeningHours?: { periods?: unknown[]; weekdayDescriptions?: string[] };
  types?: string[];
  primaryType?: string;
  location?: { latitude?: number; longitude?: number };
  googleMapsUri?: string;
  businessStatus?: string;
}

export interface TextSearchParams {
  textQuery: string;
  center: LatLng;
  radiusM: number;
  pageToken?: string;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

interface ClientOptions {
  fetch?: FetchLike;
  timeoutMs?: number;
}

/** Tipos de resultado do Geocoding que NÃO são uma cidade (ex.: digitou só o estado). */
const NOT_A_CITY = new Set(["country", "administrative_area_level_1"]);

export function createGoogleClient(apiKey: string, options: ClientOptions = {}) {
  const doFetch: FetchLike = options.fetch ?? ((input, init) => fetch(input, init));
  const timeoutMs = options.timeoutMs ?? 10_000;
  let requests = 0;

  /** Timeout de 10s por requisição e uma nova tentativa em erro 5xx ou falha de rede. */
  async function request(url: string, init?: RequestInit): Promise<Response> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      requests++;
      try {
        const res = await doFetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
        if (res.status >= 500 && attempt === 0) {
          await res.body?.cancel();
          continue;
        }
        return res;
      } catch (err) {
        lastError = err;
      }
    }
    console.error("[google] falha de rede/timeout", lastError);
    throw new GoogleError("GOOGLE_UNAVAILABLE", "O Google não respondeu a tempo.");
  }

  async function geocode(city: string): Promise<Geocoded> {
    const params = new URLSearchParams({
      address: `${city}, Brasil`,
      components: "country:BR",
      region: "br",
      language: "pt-BR",
      key: apiKey,
    });
    const res = await request(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
    const body = await res.json().catch(() => ({}));
    const status: string = body.status ?? `HTTP_${res.status}`;

    if (status === "OK" && Array.isArray(body.results) && body.results.length > 0) {
      const first = body.results[0];
      const types: string[] = first.types ?? [];
      if (types.length > 0 && types.every((t) => NOT_A_CITY.has(t) || t === "political")) {
        throw new GoogleError("CITY_NOT_FOUND", "Resultado não é uma cidade.");
      }
      const loc = first.geometry?.location;
      if (typeof loc?.lat !== "number" || typeof loc?.lng !== "number") {
        throw new GoogleError("CITY_NOT_FOUND", "Resultado sem coordenadas.");
      }
      return { lat: loc.lat, lng: loc.lng, formattedAddress: first.formatted_address ?? city };
    }
    if (status === "ZERO_RESULTS") throw new GoogleError("CITY_NOT_FOUND", "Cidade não encontrada.");
    if (status === "OVER_QUERY_LIMIT" || status === "OVER_DAILY_LIMIT" || res.status === 429) {
      throw new GoogleError("GOOGLE_QUOTA", "Cota do Geocoding esgotada.");
    }
    if (status === "REQUEST_DENIED" || res.status === 403) {
      console.error("[google] geocoding negado:", body.error_message);
      throw new GoogleError("GOOGLE_AUTH", "Geocoding negado.");
    }
    console.error("[google] geocoding inesperado:", status, body.error_message);
    throw new GoogleError("GOOGLE_UNAVAILABLE", "Falha no Geocoding.");
  }

  async function textSearch(p: TextSearchParams): Promise<{ places: GooglePlace[]; nextPageToken?: string }> {
    const payload: Record<string, unknown> = {
      textQuery: p.textQuery,
      languageCode: "pt-BR",
      regionCode: "BR",
      pageSize: 20,
      locationBias: {
        circle: { center: { latitude: p.center.lat, longitude: p.center.lng }, radius: p.radiusM },
      },
    };
    if (p.pageToken) payload.pageToken = p.pageToken;

    const res = await request("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) return { places: body.places ?? [], nextPageToken: body.nextPageToken };

    const status: string = body.error?.status ?? "";
    const message: string = body.error?.message ?? "";
    if (res.status === 429 || status === "RESOURCE_EXHAUSTED") {
      throw new GoogleError("GOOGLE_QUOTA", "Cota da Places API esgotada.");
    }
    if (res.status === 403 || status === "PERMISSION_DENIED" || /api key/i.test(message)) {
      console.error("[google] places negado:", res.status, message);
      throw new GoogleError("GOOGLE_AUTH", "Places API negada.");
    }
    console.error("[google] places inesperado:", res.status, message);
    throw new GoogleError("GOOGLE_UNAVAILABLE", "Falha na Places API.");
  }

  return {
    geocode,
    textSearch,
    get requests() {
      return requests;
    },
  };
}

export type GoogleClient = ReturnType<typeof createGoogleClient>;
