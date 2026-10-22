import { describe, expect, it } from "vitest";
import { scoreLead, scoreTone, type ScoreInput } from "./score";

const lead = (p: Partial<ScoreInput>): ScoreInput => ({ phoneType: "celular", rating: 4.8, reviewsCount: 120, websiteKind: "nenhum", ...p });

describe("score (pesos da Etapa 2)", () => {
  it("contato: celular 25 · fixo 12 · nenhum 0", () => {
    const pts = (phoneType: ScoreInput["phoneType"]) => scoreLead(lead({ phoneType }), "sites").criterios[0].pontos;
    expect([pts("celular"), pts("fixo"), pts("nenhum")]).toEqual([25, 12, 0]);
  });
  it("negócio ativo: 25 / 15 / 5", () => {
    const pts = (rating: number | null, reviewsCount: number) => scoreLead(lead({ rating, reviewsCount }), "sites").criterios[1].pontos;
    expect(pts(4.0, 10)).toBe(25);
    expect(pts(3.9, 200)).toBe(15);
    expect(pts(3.5, 5)).toBe(15);
    expect(pts(4.9, 4)).toBe(5);
    expect(pts(null, 0)).toBe(5);
  });
  it("sites: sem site 50 · rede social 35 · tem site 0 (total até 100)", () => {
    expect(scoreLead(lead({ websiteKind: "nenhum" }), "sites").total).toBe(100);
    expect(scoreLead(lead({ websiteKind: "rede_social" }), "sites").total).toBe(85);
    expect(scoreLead(lead({ websiteKind: "site" }), "sites").total).toBe(50);
  });
  it("marketing: presença (25/15/0) + avaliações (<10: 25 · <30: 15 · demais 0)", () => {
    expect(scoreLead(lead({ websiteKind: "nenhum", reviewsCount: 5, rating: 3.6 }), "marketing").total).toBe(25 + 15 + 25 + 25);
    expect(scoreLead(lead({ websiteKind: "rede_social", reviewsCount: 20 }), "marketing").total).toBe(25 + 25 + 15 + 15);
    expect(scoreLead(lead({ websiteKind: "site", reviewsCount: 300 }), "marketing").total).toBe(25 + 25 + 0 + 0);
  });
  it("automações/apps: ≥200 50 · ≥100 40 · ≥50 25 · demais 10", () => {
    const lac = (reviewsCount: number) => scoreLead(lead({ reviewsCount }), "automacoes").criterios[2].pontos;
    expect([lac(200), lac(100), lac(50), lac(49)]).toEqual([50, 40, 25, 10]);
    expect(scoreLead(lead({ reviewsCount: 250 }), "apps").total).toBe(100);
  });
  it("design/outro: presença (25/15/0) + avaliações (<50: 15 · demais 10)", () => {
    expect(scoreLead(lead({ websiteKind: "nenhum", reviewsCount: 20 }), "design").total).toBe(25 + 25 + 25 + 15);
    expect(scoreLead(lead({ websiteKind: "site", reviewsCount: 120 }), "outro").total).toBe(25 + 25 + 0 + 10);
  });
  it("sempre entre 0 e 100 e com critérios explicados", () => {
    const r = scoreLead(lead({ phoneType: "nenhum", rating: null, reviewsCount: 0, websiteKind: "site" }), "sites");
    expect(r.total).toBe(5);
    expect(r.criterios.every((c) => c.label.length > 0 && c.pontos <= c.max)).toBe(true);
  });
  it("faixas de cor", () => {
    expect([scoreTone(75), scoreTone(74), scoreTone(50), scoreTone(49), scoreTone(30), scoreTone(29)]).toEqual(["high", "mid", "mid", "low", "low", "min"]);
  });
});
