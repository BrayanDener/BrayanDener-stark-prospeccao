import { describe, expect, it } from "vitest";
import { STATUSES } from "@/config/status";
import { phoneKind } from "@/lib/phone";
import { getWebPresence } from "@/lib/filters";
import { buildInitialData, generateSearchResults } from ".";
import { MOCK_LEADS } from "./leads";

describe("mocks", () => {
  it("têm 24+ leads escritos à mão cobrindo status, telefones e presença", () => {
    expect(MOCK_LEADS.length).toBeGreaterThanOrEqual(24);
    for (const s of STATUSES) expect(MOCK_LEADS.some((l) => l.status === s.key)).toBe(true);
    for (const k of ["celular", "fixo", "nenhum"] as const) expect(MOCK_LEADS.some((l) => phoneKind(l.phone) === k)).toBe(true);
    for (const p of ["site", "social", "none"] as const) expect(MOCK_LEADS.some((l) => getWebPresence(l) === p)).toBe(true);
  });
  it("ids únicos", () => {
    const { leads } = buildInitialData();
    expect(new Set(leads.map((l) => l.id)).size).toBe(leads.length);
  });
  it("gerador é determinístico por cidade + nicho", () => {
    const a = generateSearchResults({ city: "Itabira", niche: "padarias", service: "sites" }, { searchId: "a", createdAt: "2026-01-01" });
    const b = generateSearchResults({ city: "itabira", niche: "padarias", service: "sites" }, { searchId: "b", createdAt: "2026-01-01" });
    expect(a.map((l) => l.name)).toEqual(b.map((l) => l.name));
  });
});
