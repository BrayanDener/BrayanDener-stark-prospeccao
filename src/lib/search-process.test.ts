import { describe, expect, it } from "vitest";
import { collectPlaces, haversineMeters, isUsablePlace, toLeadRow } from "../../supabase/functions/search-leads/process";
import type { GooglePlace } from "../../supabase/functions/search-leads/google";

const center = { lat: -19.6243, lng: -43.2236 }; // Itabira
const place = (id: string, p: Partial<GooglePlace> = {}): GooglePlace => ({
  id,
  displayName: { text: `Barbearia ${id}` },
  location: { latitude: center.lat + 0.01, longitude: center.lng },
  businessStatus: "OPERATIONAL",
  ...p,
});

describe("pós-processamento da busca (Edge Function)", () => {
  it("distância aproximada correta", () => {
    expect(Math.round(haversineMeters(center, { lat: center.lat + 0.1, lng: center.lng }) / 1000)).toBe(11);
  });
  it("descarta fechados e longe demais (raio + 5 km)", () => {
    expect(isUsablePlace(place("a"), center, 8000)).toBe(true);
    expect(isUsablePlace(place("b", { businessStatus: "CLOSED_PERMANENTLY" }), center, 8000)).toBe(false);
    expect(isUsablePlace(place("c", { location: { latitude: center.lat + 0.2, longitude: center.lng } }), center, 8000)).toBe(false);
  });
  it("converte para linha de leads (E.164, tipo de telefone e site)", () => {
    const row = toLeadRow(place("x", { internationalPhoneNumber: "+55 31 98658-6299", websiteUri: "https://instagram.com/x", rating: 4.84, userRatingCount: 211 }), { city: "Itabira", niche: "barbearias" });
    expect(row).toMatchObject({ phone_e164: "+5531986586299", phone_type: "celular", website_kind: "rede_social", rating: 4.8, reviews_count: 211 });
  });
  it("sem duplicados, paginação e raio progressivo até 15 empresas", async () => {
    const calls: { q: string; r: number; token?: string }[] = [];
    const fake = {
      textSearch: async (p: { textQuery: string; radiusM: number; pageToken?: string }) => {
        calls.push({ q: p.textQuery, r: p.radiusM, token: p.pageToken });
        // 8 km: 6 empresas (com duplicadas entre palavras); 20 km: +12 novas
        if (p.radiusM === 8000) return { places: ["1", "2", "3", "4", "5", "6"].map((i) => place(i)) };
        if (!p.pageToken) return { places: ["7", "8", "9", "10", "11", "12"].map((i) => place(i)), nextPageToken: "pag2" };
        return { places: ["13", "14", "15", "16", "17", "18"].map((i) => place(`${i}${p.textQuery.length}`)) };
      },
    };
    const res = await collectPlaces(fake, { keywords: ["barbearia", "barbeiro"], city: "Itabira", center });
    expect(res.radiusUsed).toBe(20000);
    expect(new Set(res.places.map((p) => p.id)).size).toBe(res.places.length);
    expect(res.places.length).toBeGreaterThanOrEqual(15);
    expect(calls.filter((c) => c.r === 40000)).toHaveLength(0);
    expect(calls.every((c) => c.q.endsWith(" em Itabira"))).toBe(true);
  });
});
