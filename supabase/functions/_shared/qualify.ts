/**
 * Filtro por serviço — fonte única (app: src/lib/filters.ts · Edge Function: total_qualified).
 */
import type { ServiceKey } from "./services.ts";
import type { WebsiteKind } from "./website.ts";

/** Abaixo disso o negócio tem "poucas avaliações" (filtro de Marketing). */
export const LOW_REVIEWS_THRESHOLD = 30;

export interface QualifyInput {
  website_kind: WebsiteKind;
  reviews_count: number;
}

export interface QualifyOptions {
  /** user_settings.min_reviews_busy (padrão 50). */
  minReviewsBusy: number;
}

export function passesServiceFilter(lead: QualifyInput, service: ServiceKey, opts: QualifyOptions): boolean {
  switch (service) {
    case "sites":
      return lead.website_kind === "nenhum" || lead.website_kind === "rede_social";
    case "marketing":
      return lead.website_kind !== "site" || lead.reviews_count < LOW_REVIEWS_THRESHOLD;
    case "automacoes":
    case "apps":
      return lead.reviews_count >= opts.minReviewsBusy;
    case "design":
    case "outro":
      return true;
  }
}
