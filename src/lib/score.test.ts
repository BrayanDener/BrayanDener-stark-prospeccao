import { describe, expect, it } from "vitest";
import { scoreLead, scoreTone } from "./score";
import type { ScoreInput } from "./score";
import { SERVICES } from "@/config/services";

const base: ScoreInput = { website: null, instagram: null, phone: null, rating: null, reviewCount: 0, hours: null, niche: "barbearias" };
const full: ScoreInput = {
  ...base,
  instagram: "barbearia",
  phone: "(31) 98812-4471",
  rating: 4.8,
  reviewCount: 400,
  hours: [1, 2, 3, 4, 5, 6].map((d) => ({ day: d as 1, open: "09:00", close: "19:00" })),
};

describe("score", () => {
  it("critérios de cada serviço somam 100", () => {
    for (const s of SERVICES) {
      const { criteria } = scoreLead(base, s.key, { minReviews: 50 });
      expect(criteria.reduce((sum, c) => sum + c.max, 0)).toBe(100);
    }
  });
  it("lead sem site, com celular e movimento é ótimo para Sites", () => {
    expect(scoreLead(full, "sites", { minReviews: 50 }).score).toBe(100);
  });
  it("lead com site perde os pontos de 'sem site'", () => {
    const r = scoreLead({ ...full, instagram: null, website: "https://x.com.br" }, "sites", { minReviews: 50 });
    expect(r.criteria.find((c) => c.key === "sem_site")?.met).toBe(false);
    expect(r.score).toBe(55);
  });
  it("faixas de cor", () => {
    expect(scoreTone(75)).toBe("high");
    expect(scoreTone(74)).toBe("mid");
    expect(scoreTone(50)).toBe("mid");
    expect(scoreTone(49)).toBe("low");
    expect(scoreTone(30)).toBe("low");
    expect(scoreTone(29)).toBe("min");
  });
});
