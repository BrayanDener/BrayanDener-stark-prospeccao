/**
 * Score de oportunidade 0–100 (Etapa 2).
 * Contato (até 25) + Negócio ativo (até 25) + Lacuna para o serviço (até 50).
 * Os pesos ficam nas constantes abaixo: ajuste aqui e o app inteiro acompanha.
 */
import type { Lead, ServiceKey } from "@/types";

export const SCORE_WEIGHTS = {
  contato: { celular: 25, fixo: 12, nenhum: 0 },
  ativo: {
    /** nota ≥ 4,0 e ≥ 10 avaliações */
    forte: { minRating: 4.0, minReviews: 10, pontos: 25 },
    /** nota ≥ 3,5 e ≥ 5 avaliações */
    medio: { minRating: 3.5, minReviews: 5, pontos: 15 },
    demais: 5,
  },
  lacuna: {
    sites: { nenhum: 50, rede_social: 35, site: 0 },
    marketing: {
      presenca: { nenhum: 25, rede_social: 15, site: 0 },
      /** avaliações < 10 → 25 · < 30 → 15 · demais 0 */
      avaliacoes: [
        { below: 10, pontos: 25 },
        { below: 30, pontos: 15 },
      ],
    },
    /** automações e apps: avaliações ≥ 200 → 50 · ≥ 100 → 40 · ≥ 50 → 25 · demais 10 */
    movimento: [
      { atLeast: 200, pontos: 50 },
      { atLeast: 100, pontos: 40 },
      { atLeast: 50, pontos: 25 },
    ],
    movimentoDemais: 10,
    designOutro: {
      presenca: { nenhum: 25, rede_social: 15, site: 0 },
      /** avaliações < 50 → 15 · demais 10 */
      poucasAvaliacoes: { below: 50, pontos: 15 },
      demais: 10,
    },
  },
} as const;

export type ScoreInput = Pick<Lead, "phoneType" | "rating" | "reviewsCount" | "websiteKind">;

export interface ScoreCriterion {
  label: string;
  pontos: number;
  max: number;
}

export interface ScoreResult {
  total: number;
  criterios: ScoreCriterion[];
}

const fmtRating = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function contato(lead: ScoreInput): ScoreCriterion {
  const w = SCORE_WEIGHTS.contato;
  const label =
    lead.phoneType === "celular" ? "Contato: celular (provável WhatsApp)" : lead.phoneType === "fixo" ? "Contato: só telefone fixo" : "Contato: sem telefone";
  return { label, pontos: w[lead.phoneType], max: w.celular };
}

function ativo(lead: ScoreInput): ScoreCriterion {
  const w = SCORE_WEIGHTS.ativo;
  const rating = lead.rating ?? 0;
  const reviews = lead.reviewsCount;
  const resumo = lead.rating === null ? "sem nota" : `nota ${fmtRating(rating)}, ${reviews} avaliações`;
  if (rating >= w.forte.minRating && reviews >= w.forte.minReviews) return { label: `Negócio ativo (${resumo})`, pontos: w.forte.pontos, max: w.forte.pontos };
  if (rating >= w.medio.minRating && reviews >= w.medio.minReviews) return { label: `Negócio razoavelmente ativo (${resumo})`, pontos: w.medio.pontos, max: w.forte.pontos };
  return { label: `Pouca atividade no Google (${resumo})`, pontos: w.demais, max: w.forte.pontos };
}

const PRESENCA_LABEL = { nenhum: "Não tem site", rede_social: "Só rede social, sem site próprio", site: "Já tem site" } as const;

function lacuna(lead: ScoreInput, service: ServiceKey): ScoreCriterion[] {
  const L = SCORE_WEIGHTS.lacuna;
  const reviews = lead.reviewsCount;
  switch (service) {
    case "sites":
      return [{ label: PRESENCA_LABEL[lead.websiteKind], pontos: L.sites[lead.websiteKind], max: L.sites.nenhum }];
    case "marketing": {
      const tier = L.marketing.avaliacoes.find((t) => reviews < t.below);
      return [
        { label: PRESENCA_LABEL[lead.websiteKind], pontos: L.marketing.presenca[lead.websiteKind], max: L.marketing.presenca.nenhum },
        {
          label: tier ? `Poucas avaliações (${reviews}): espaço para crescer` : `Já tem ${reviews} avaliações`,
          pontos: tier?.pontos ?? 0,
          max: L.marketing.avaliacoes[0].pontos,
        },
      ];
    }
    case "automacoes":
    case "apps": {
      const tier = L.movimento.find((t) => reviews >= t.atLeast);
      return [
        {
          label: tier ? `Movimento alto: ${reviews} avaliações` : `Pouco movimento: ${reviews} avaliações`,
          pontos: tier?.pontos ?? L.movimentoDemais,
          max: L.movimento[0].pontos,
        },
      ];
    }
    case "design":
    case "outro": {
      const d = L.designOutro;
      const poucas = reviews < d.poucasAvaliacoes.below;
      return [
        { label: PRESENCA_LABEL[lead.websiteKind], pontos: d.presenca[lead.websiteKind], max: d.presenca.nenhum },
        {
          label: poucas ? `Menos de ${d.poucasAvaliacoes.below} avaliações` : `${reviews} avaliações`,
          pontos: poucas ? d.poucasAvaliacoes.pontos : d.demais,
          max: d.poucasAvaliacoes.pontos,
        },
      ];
    }
  }
}

export function scoreLead(lead: ScoreInput, service: ServiceKey): ScoreResult {
  const criterios = [contato(lead), ativo(lead), ...lacuna(lead, service)];
  const total = Math.max(0, Math.min(100, criterios.reduce((sum, c) => sum + c.pontos, 0)));
  return { total, criterios };
}

export type ScoreTone = "high" | "mid" | "low" | "min";

/** ≥75 verde · 50–74 azul · 30–49 âmbar · <30 cinza */
export function scoreTone(score: number): ScoreTone {
  if (score >= 75) return "high";
  if (score >= 50) return "mid";
  if (score >= 30) return "low";
  return "min";
}
