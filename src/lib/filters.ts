/**
 * Filtros da interface. A regra por serviço vem de supabase/functions/_shared/qualify.ts
 * (a mesma que a Edge Function usa para total_qualified).
 */
import type { Lead, LeadStatus, ServiceKey } from "@/types";
import { LOW_REVIEWS_THRESHOLD, passesServiceFilter as passesCore } from "../../supabase/functions/_shared/qualify";

export { LOW_REVIEWS_THRESHOLD };

export interface FilterOptions {
  /** user_settings.min_reviews_busy (padrão 50). */
  minReviewsBusy: number;
}

type QualifyLead = Pick<Lead, "websiteKind" | "reviewsCount">;

export function passesServiceFilter(lead: QualifyLead, service: ServiceKey, opts: FilterOptions): boolean {
  return passesCore({ website_kind: lead.websiteKind, reviews_count: lead.reviewsCount }, service, opts);
}

/** Regra em linguagem simples, para o resumo do wizard. */
export function describeServiceFilter(service: ServiceKey, opts: FilterOptions): string {
  switch (service) {
    case "sites":
      return "Só empresas sem site próprio. Quem tem só Instagram ou link de agendamento também aparece.";
    case "marketing":
      return `Empresas sem site próprio ou com menos de ${LOW_REVIEWS_THRESHOLD} avaliações no Google.`;
    case "automacoes":
      return `Negócios com ${opts.minReviewsBusy} avaliações ou mais: muito movimento, atendimento para automatizar.`;
    case "apps":
      return `Negócios com ${opts.minReviewsBusy} avaliações ou mais: movimento suficiente para precisar de agenda e gestão.`;
    case "design":
    case "outro":
      return "Sem filtro: todos os resultados aparecem.";
  }
}

export function serviceHasFilter(service: ServiceKey): boolean {
  return service !== "design" && service !== "outro";
}

export interface ServiceFilterResult<T> {
  /** Leads exibidos (com showAll, inclui os que não passariam). */
  visible: T[];
  /** Quantos não passam no filtro do serviço. */
  removed: number;
  /** ids que não passam no filtro (recebem a tag "Fora do filtro" quando showAll). */
  outside: Set<string>;
}

export function applyServiceFilter<T extends QualifyLead & { id: string }>(
  leads: T[],
  service: ServiceKey,
  opts: FilterOptions & { showAll?: boolean },
): ServiceFilterResult<T> {
  const outside = new Set<string>();
  for (const l of leads) if (!passesServiceFilter(l, service, opts)) outside.add(l.id);
  const visible = opts.showAll ? leads : leads.filter((l) => !outside.has(l.id));
  return { visible, removed: outside.size, outside };
}

/** Já abordado = status diferente de 'novo'. */
export function isContacted(lead: Pick<Lead, "status">): boolean {
  return lead.status !== "novo";
}

/** Remove acentos e caixa para busca por nome. */
export function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

export interface LeadListFilters {
  query: string;
  status: LeadStatus | "todos";
  noSite: boolean;
  mobileOnly: boolean;
  hideContacted: boolean;
}

export function applyListFilters<T extends Lead>(leads: T[], f: LeadListFilters): T[] {
  const q = normalizeText(f.query);
  return leads.filter((l) => {
    if (q && !normalizeText(`${l.name} ${l.address ?? ""}`).includes(q)) return false;
    if (f.status !== "todos" && l.status !== f.status) return false;
    if (f.noSite && l.websiteKind === "site") return false;
    if (f.mobileOnly && l.phoneType !== "celular") return false;
    if (f.hideContacted && isContacted(l)) return false;
    return true;
  });
}

export type SortKey = "score" | "reviews" | "rating" | "name";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Score" },
  { key: "reviews", label: "Avaliações" },
  { key: "rating", label: "Nota" },
  { key: "name", label: "Nome" },
];

export function sortLeads<T extends Lead>(leads: T[], key: SortKey, getScore: (lead: T) => number): T[] {
  const copy = [...leads];
  const byName = (a: T, b: T) => a.name.localeCompare(b.name, "pt-BR");
  switch (key) {
    case "score":
      return copy.sort((a, b) => getScore(b) - getScore(a) || b.reviewsCount - a.reviewsCount || byName(a, b));
    case "reviews":
      return copy.sort((a, b) => b.reviewsCount - a.reviewsCount || byName(a, b));
    case "rating":
      return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.reviewsCount - a.reviewsCount);
    case "name":
      return copy.sort(byName);
  }
}
