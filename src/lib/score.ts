import { SCHEDULING_NICHES } from "@/config/niches";
import type { Lead, ServiceKey } from "@/types";
import { getWebPresence, LOW_REVIEWS_THRESHOLD, type FilterOptions } from "./filters";
import { daysOpen } from "./hours";
import { isMobile } from "./phone";

export type ScoreInput = Pick<Lead, "website" | "instagram" | "phone" | "rating" | "reviewCount" | "hours" | "niche">;

export interface ScoreCriterion {
  key: string;
  label: string;
  /** Pontos que o critério vale. */
  max: number;
  met: boolean;
}

export interface ScoreResult {
  score: number;
  criteria: ScoreCriterion[];
}

const fmt = (n: number) => n.toLocaleString("pt-BR");

/**
 * Score de oportunidade (0–100) de um lead para o serviço da busca.
 * Cada serviço tem critérios que somam 100 pontos.
 */
export function scoreLead(lead: ScoreInput, service: ServiceKey, opts: FilterOptions): ScoreResult {
  const presence = getWebPresence(lead);
  const mobile = isMobile(lead.phone);
  const rating = lead.rating ?? 0;
  const reviews = lead.reviewCount;
  const openDays = daysOpen(lead.hours);
  const min = opts.minReviews;

  const whatsapp: ScoreCriterion = { key: "celular", label: "Tem celular (provável WhatsApp)", max: 25, met: mobile };

  let criteria: ScoreCriterion[];
  switch (service) {
    case "sites":
      criteria = [
        { key: "sem_site", label: "Não tem site próprio", max: 35, met: presence !== "site" },
        whatsapp,
        { key: "movimento", label: "20+ avaliações (tem clientela)", max: 15, met: reviews >= 20 },
        { key: "instagram", label: "Já usa Instagram (valoriza presença online)", max: 10, met: presence === "social" },
        { key: "nota", label: "Nota 4,0 ou mais", max: 10, met: rating >= 4 },
        { key: "horario", label: "Horário cadastrado no Google", max: 5, met: openDays > 0 },
      ];
      break;
    case "marketing":
      criteria = [
        whatsapp,
        { key: "sem_site", label: "Não tem site próprio", max: 20, met: presence !== "site" },
        { key: "poucas_avaliacoes", label: `Menos de ${LOW_REVIEWS_THRESHOLD} avaliações`, max: 20, met: reviews < LOW_REVIEWS_THRESHOLD },
        { key: "movimento", label: "10+ avaliações (já tem clientes)", max: 15, met: reviews >= 10 },
        { key: "instagram", label: "Ativo no Instagram", max: 10, met: presence === "social" || !!lead.instagram },
        { key: "reputacao", label: "Nota abaixo de 4,5 (reputação a melhorar)", max: 10, met: lead.rating !== null && rating < 4.5 },
      ];
      break;
    case "automacoes":
      criteria = [
        { key: "movimento", label: `${fmt(min)}+ avaliações (negócio movimentado)`, max: 30, met: reviews >= min },
        whatsapp,
        { key: "nota", label: "Nota 4,3 ou mais", max: 15, met: rating >= 4.3 },
        { key: "alto_volume", label: `${fmt(min * 3)}+ avaliações (alto volume)`, max: 10, met: reviews >= min * 3 },
        { key: "site", label: "Já tem site (maturidade digital)", max: 10, met: presence === "site" },
        { key: "dias", label: "Abre 6 dias ou mais", max: 10, met: openDays >= 6 },
      ];
      break;
    case "apps":
      criteria = [
        { key: "movimento", label: `${fmt(min)}+ avaliações (negócio movimentado)`, max: 30, met: reviews >= min },
        whatsapp,
        { key: "agenda", label: "Nicho que depende de agenda", max: 20, met: SCHEDULING_NICHES.includes(lead.niche) },
        { key: "nota", label: "Nota 4,3 ou mais", max: 15, met: rating >= 4.3 },
        { key: "dias", label: "Abre 6 dias ou mais", max: 10, met: openDays >= 6 },
      ];
      break;
    case "design":
    case "outro":
      criteria = [
        { ...whatsapp, max: 30 },
        { key: "nota", label: "Nota 4,0 ou mais", max: 20, met: rating >= 4 },
        { key: "movimento", label: "20+ avaliações (tem clientela)", max: 20, met: reviews >= 20 },
        { key: "sem_site", label: "Sem site ou só Instagram", max: 15, met: presence !== "site" },
        { key: "instagram", label: "Ativo no Instagram", max: 15, met: presence === "social" || !!lead.instagram },
      ];
      break;
  }

  const score = Math.min(100, criteria.reduce((sum, c) => sum + (c.met ? c.max : 0), 0));
  return { score, criteria };
}

export type ScoreTone = "high" | "mid" | "low" | "min";

/** ≥75 verde · 50–74 azul · 30–49 âmbar · <30 cinza */
export function scoreTone(score: number): ScoreTone {
  if (score >= 75) return "high";
  if (score >= 50) return "mid";
  if (score >= 30) return "low";
  return "min";
}
