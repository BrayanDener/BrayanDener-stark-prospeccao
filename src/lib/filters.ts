import type { Lead, LeadStatus, NicheKey, ServiceKey } from "@/types";
import { endOfDay, startOfDay } from "./format";
import { isMobile } from "./phone";

/** Abaixo disso o negócio tem "poucas avaliações" (filtro de Marketing). */
export const LOW_REVIEWS_THRESHOLD = 30;

export interface FilterOptions {
  /** Mínimo de avaliações para Automações / Apps (Configurações). */
  minReviews: number;
}

type PresenceInput = Pick<Lead, "website" | "instagram">;

const SOCIAL_DOMAINS = ["instagram.com", "facebook.com", "fb.com", "linktr.ee", "wa.me", "whatsapp.com", "tiktok.com"];

export type WebPresence = "site" | "social" | "none";

export function isSocialUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return SOCIAL_DOMAINS.some((d) => lower.includes(d));
}

/** "site" = site próprio; "social" = só rede social (Instagram/link na bio); "none" = nada. */
export function getWebPresence(lead: PresenceInput): WebPresence {
  if (lead.website && !isSocialUrl(lead.website)) return "site";
  if (lead.instagram || (lead.website && isSocialUrl(lead.website))) return "social";
  return "none";
}

export const hasOwnSite = (lead: PresenceInput) => getWebPresence(lead) === "site";

type FilterInput = PresenceInput & Pick<Lead, "reviewCount">;

/** Regra de qualificação de cada serviço. */
export function passesServiceFilter(lead: FilterInput, service: ServiceKey, opts: FilterOptions): boolean {
  switch (service) {
    case "sites":
      return !hasOwnSite(lead);
    case "marketing":
      return !hasOwnSite(lead) || lead.reviewCount < LOW_REVIEWS_THRESHOLD;
    case "automacoes":
    case "apps":
      return lead.reviewCount >= opts.minReviews;
    case "design":
    case "outro":
      return true;
  }
}

/** Regra em linguagem simples, para o resumo do wizard. */
export function describeServiceFilter(service: ServiceKey, opts: FilterOptions): string {
  switch (service) {
    case "sites":
      return "Só empresas sem site próprio. Quem tem só Instagram também aparece.";
    case "marketing":
      return `Empresas sem site ou com menos de ${LOW_REVIEWS_THRESHOLD} avaliações no Google.`;
    case "automacoes":
      return `Negócios com ${opts.minReviews} avaliações ou mais: muito movimento, atendimento para automatizar.`;
    case "apps":
      return `Negócios com ${opts.minReviews} avaliações ou mais: movimento suficiente para precisar de agenda e gestão.`;
    case "design":
    case "outro":
      return "Sem filtro: todos os resultados aparecem.";
  }
}

export function serviceHasFilter(service: ServiceKey): boolean {
  return service !== "design" && service !== "outro";
}

export function applyServiceFilter<T extends FilterInput>(
  leads: T[],
  service: ServiceKey,
  opts: FilterOptions & { ignoreFilter?: boolean },
): { qualified: T[]; removed: number } {
  if (opts.ignoreFilter) return { qualified: leads, removed: 0 };
  const qualified = leads.filter((l) => passesServiceFilter(l, service, opts));
  return { qualified, removed: leads.length - qualified.length };
}

export function isContacted(lead: Pick<Lead, "status" | "lastContactAt">): boolean {
  return lead.status !== "novo" || lead.lastContactAt !== null;
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
    if (q && !normalizeText(`${l.name} ${l.neighborhood}`).includes(q)) return false;
    if (f.status !== "todos" && l.status !== f.status) return false;
    if (f.noSite && hasOwnSite(l)) return false;
    if (f.mobileOnly && !isMobile(l.phone)) return false;
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
      return copy.sort((a, b) => getScore(b) - getScore(a) || b.reviewCount - a.reviewCount);
    case "reviews":
      return copy.sort((a, b) => b.reviewCount - a.reviewCount || byName(a, b));
    case "rating":
      return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.reviewCount - a.reviewCount);
    case "name":
      return copy.sort(byName);
  }
}

/** Follow-up para hoje ou atrasado. */
export function isFollowUpDue(lead: Pick<Lead, "nextFollowUpAt">, now: Date = new Date()): boolean {
  return !!lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) <= endOfDay(now);
}

export function isFollowUpOverdue(lead: Pick<Lead, "nextFollowUpAt">, now: Date = new Date()): boolean {
  return !!lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) < startOfDay(now);
}

export interface CrmFilters {
  status: LeadStatus | "todos";
  city: string | "todas";
  niche: NicheKey | "todos";
  overdueOnly: boolean;
  query: string;
}

export function applyCrmFilters<T extends Lead>(leads: T[], f: CrmFilters, now: Date = new Date()): T[] {
  const q = normalizeText(f.query);
  return leads.filter((l) => {
    if (f.status !== "todos" && l.status !== f.status) return false;
    if (f.city !== "todas" && l.city !== f.city) return false;
    if (f.niche !== "todos" && l.niche !== f.niche) return false;
    if (f.overdueOnly && !isFollowUpOverdue(l, now)) return false;
    if (q && !normalizeText(l.name).includes(q)) return false;
    return true;
  });
}
