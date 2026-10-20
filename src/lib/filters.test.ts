import { describe, expect, it } from "vitest";
import { applyServiceFilter, getWebPresence, isFollowUpDue, isFollowUpOverdue, passesServiceFilter, sortLeads } from "./filters";
import { MOCK_LEADS } from "@/mocks/leads";

const opts = { minReviews: 50 };
const lead = (p: { website?: string | null; instagram?: string | null; reviewCount?: number }) => ({
  website: p.website ?? null,
  instagram: p.instagram ?? null,
  reviewCount: p.reviewCount ?? 0,
});

describe("presença online", () => {
  it("trata Instagram e linktree como rede social, não site", () => {
    expect(getWebPresence(lead({ website: "https://instagram.com/x" }))).toBe("social");
    expect(getWebPresence(lead({ website: "https://linktr.ee/x" }))).toBe("social");
    expect(getWebPresence(lead({ instagram: "x" }))).toBe("social");
    expect(getWebPresence(lead({ website: "https://x.com.br" }))).toBe("site");
    expect(getWebPresence(lead({}))).toBe("none");
  });
});

describe("filtro por serviço", () => {
  it("sites: só sem site próprio", () => {
    expect(passesServiceFilter(lead({}), "sites", opts)).toBe(true);
    expect(passesServiceFilter(lead({ website: "https://instagram.com/x" }), "sites", opts)).toBe(true);
    expect(passesServiceFilter(lead({ website: "https://x.com.br" }), "sites", opts)).toBe(false);
  });
  it("marketing: sem site OU poucas avaliações", () => {
    expect(passesServiceFilter(lead({ website: "https://x.com.br", reviewCount: 10 }), "marketing", opts)).toBe(true);
    expect(passesServiceFilter(lead({ website: "https://x.com.br", reviewCount: 200 }), "marketing", opts)).toBe(false);
  });
  it("automações e apps: mínimo de avaliações configurável", () => {
    expect(passesServiceFilter(lead({ reviewCount: 50 }), "automacoes", opts)).toBe(true);
    expect(passesServiceFilter(lead({ reviewCount: 49 }), "apps", opts)).toBe(false);
    expect(passesServiceFilter(lead({ reviewCount: 49 }), "apps", { minReviews: 20 })).toBe(true);
  });
  it("design e outro: tudo passa; ignoreFilter desliga", () => {
    expect(passesServiceFilter(lead({ website: "https://x.com.br" }), "design", opts)).toBe(true);
    const leads = [lead({ website: "https://x.com.br" }), lead({})];
    expect(applyServiceFilter(leads, "sites", opts)).toEqual({ qualified: [leads[1]], removed: 1 });
    expect(applyServiceFilter(leads, "sites", { ...opts, ignoreFilter: true }).removed).toBe(0);
  });
});

describe("follow-up e ordenação", () => {
  const now = new Date(2026, 9, 20, 12);
  it("hoje conta como pendente; ontem como atrasado", () => {
    expect(isFollowUpDue({ nextFollowUpAt: new Date(2026, 9, 20, 18).toISOString() }, now)).toBe(true);
    expect(isFollowUpOverdue({ nextFollowUpAt: new Date(2026, 9, 20, 8).toISOString() }, now)).toBe(false);
    expect(isFollowUpOverdue({ nextFollowUpAt: new Date(2026, 9, 19, 9).toISOString() }, now)).toBe(true);
    expect(isFollowUpDue({ nextFollowUpAt: null }, now)).toBe(false);
  });
  it("ordena por nome em pt-BR", () => {
    const sorted = sortLeads(MOCK_LEADS.slice(0, 4), "name", () => 0).map((l) => l.name);
    expect(sorted).toEqual([...sorted].sort((a, b) => a.localeCompare(b, "pt-BR")));
  });
});
