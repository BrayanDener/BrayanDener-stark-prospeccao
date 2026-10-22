import { describe, expect, it } from "vitest";
import type { Lead } from "@/types";
import { applyListFilters, applyServiceFilter, passesServiceFilter, sortLeads } from "./filters";

const opts = { minReviewsBusy: 50 };
const q = (websiteKind: Lead["websiteKind"], reviewsCount: number) => ({ websiteKind, reviewsCount });

export function makeLead(p: Partial<Lead> & { id: string }): Lead {
  return {
    placeId: p.id, name: p.id, address: null, city: "Itabira", niche: "barbearias", phoneNational: null, phoneE164: null,
    phoneType: "celular", website: null, websiteKind: "nenhum", rating: 4.5, reviewsCount: 40, openingHours: null, types: [],
    primaryType: null, lat: null, lng: null, googleMapsUri: null, businessStatus: "OPERATIONAL", firstSeenAt: "2026-10-01T00:00:00Z",
    lastFetchedAt: "2026-10-01T00:00:00Z", status: "novo", notes: "", lastContactAt: null, repliedAt: null, followUpAt: null,
    closedAt: null, statusUpdatedAt: null, lastService: "sites", ...p,
  };
}

describe("filtro por serviço", () => {
  it("sites: só sem site ou só rede social", () => {
    expect(passesServiceFilter(q("nenhum", 0), "sites", opts)).toBe(true);
    expect(passesServiceFilter(q("rede_social", 0), "sites", opts)).toBe(true);
    expect(passesServiceFilter(q("site", 0), "sites", opts)).toBe(false);
  });
  it("marketing: sem site próprio OU menos de 30 avaliações", () => {
    expect(passesServiceFilter(q("site", 29), "marketing", opts)).toBe(true);
    expect(passesServiceFilter(q("site", 30), "marketing", opts)).toBe(false);
    expect(passesServiceFilter(q("rede_social", 500), "marketing", opts)).toBe(true);
  });
  it("automações/apps: mínimo de avaliações configurável", () => {
    expect(passesServiceFilter(q("site", 50), "automacoes", opts)).toBe(true);
    expect(passesServiceFilter(q("site", 49), "apps", opts)).toBe(false);
    expect(passesServiceFilter(q("site", 49), "apps", { minReviewsBusy: 20 })).toBe(true);
  });
  it("design e outro: todos", () => {
    expect(passesServiceFilter(q("site", 0), "design", opts)).toBe(true);
    expect(passesServiceFilter(q("site", 0), "outro", opts)).toBe(true);
  });
  it("showAll mostra todos e marca os de fora do filtro", () => {
    const leads = [makeLead({ id: "a", websiteKind: "site" }), makeLead({ id: "b" })];
    const filtered = applyServiceFilter(leads, "sites", opts);
    expect(filtered.visible.map((l) => l.id)).toEqual(["b"]);
    expect(filtered.removed).toBe(1);
    const all = applyServiceFilter(leads, "sites", { ...opts, showAll: true });
    expect(all.visible).toHaveLength(2);
    expect(all.outside.has("a")).toBe(true);
  });
});

describe("filtros da lista e ordenação", () => {
  const leads = [
    makeLead({ id: "Barbearia Ney", status: "contatado" }),
    makeLead({ id: "Barbearia Guerra", phoneType: "fixo" }),
    makeLead({ id: "Studio 33", websiteKind: "site" }),
  ];
  const base = { query: "", status: "todos" as const, noSite: false, mobileOnly: false, hideContacted: false };
  it("ocultar já contatados, sem site, com celular e busca sem acento", () => {
    expect(applyListFilters(leads, { ...base, hideContacted: true }).map((l) => l.id)).not.toContain("Barbearia Ney");
    expect(applyListFilters(leads, { ...base, noSite: true }).map((l) => l.id)).not.toContain("Studio 33");
    expect(applyListFilters(leads, { ...base, mobileOnly: true }).map((l) => l.id)).not.toContain("Barbearia Guerra");
    expect(applyListFilters([makeLead({ id: "Salão Glória" })], { ...base, query: "salao gloria" })).toHaveLength(1);
  });
  it("ordena por score decrescente", () => {
    const scores: Record<string, number> = { "Barbearia Ney": 40, "Barbearia Guerra": 90, "Studio 33": 70 };
    expect(sortLeads(leads, "score", (l) => scores[l.id]).map((l) => l.id)).toEqual(["Barbearia Guerra", "Studio 33", "Barbearia Ney"]);
  });
});
