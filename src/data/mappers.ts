/** Linhas do banco (snake_case) → tipos do app (camelCase). */
import { isNicheKey } from "@/config/niches";
import { isServiceKey } from "@/config/services";
import type { Tables, ViewRow } from "@/integrations/supabase/types";
import type { Activity, ActivityType, DashboardSummary, Lead, LeadStatus, MessageTemplate, OpeningHours, PhoneType, Search, Settings, WebsiteKind } from "@/types";

const STATUSES: LeadStatus[] = ["novo", "contatado", "respondeu", "negociando", "fechado", "sem_interesse"];
const asStatus = (v: unknown): LeadStatus => (STATUSES.includes(v as LeadStatus) ? (v as LeadStatus) : "novo");
const asPhoneType = (v: unknown): PhoneType => (v === "celular" || v === "fixo" ? v : "nenhum");
const asWebsiteKind = (v: unknown): WebsiteKind => (v === "site" || v === "rede_social" ? v : "nenhum");

function asOpeningHours(v: unknown): OpeningHours | null {
  if (!v || typeof v !== "object") return null;
  const o = v as { periods?: unknown; weekdayDescriptions?: unknown };
  return {
    periods: Array.isArray(o.periods) ? (o.periods as OpeningHours["periods"]) : [],
    weekdayDescriptions: Array.isArray(o.weekdayDescriptions) ? (o.weekdayDescriptions as string[]) : [],
  };
}

export function toLead(r: ViewRow<"v_leads">): Lead {
  return {
    id: r.id ?? "",
    placeId: r.place_id ?? "",
    name: r.name ?? "Sem nome",
    address: r.address,
    city: r.city ?? "",
    niche: isNicheKey(r.niche) ? r.niche : "restaurantes",
    phoneNational: r.phone_national,
    phoneE164: r.phone_e164,
    phoneType: asPhoneType(r.phone_type),
    website: r.website,
    websiteKind: asWebsiteKind(r.website_kind),
    rating: r.rating === null ? null : Number(r.rating),
    reviewsCount: r.reviews_count ?? 0,
    openingHours: asOpeningHours(r.opening_hours),
    types: r.types ?? [],
    primaryType: r.primary_type,
    lat: r.lat,
    lng: r.lng,
    googleMapsUri: r.google_maps_uri,
    businessStatus: r.business_status,
    firstSeenAt: r.first_seen_at ?? new Date().toISOString(),
    lastFetchedAt: r.last_fetched_at ?? new Date().toISOString(),
    status: asStatus(r.status),
    notes: r.notes ?? "",
    lastContactAt: r.last_contact_at,
    repliedAt: r.replied_at,
    followUpAt: r.follow_up_at,
    closedAt: r.closed_at,
    statusUpdatedAt: r.status_updated_at,
    lastService: isServiceKey(r.last_service) ? r.last_service : null,
  };
}

export function toSearch(r: Tables<"searches">): Search {
  return {
    id: r.id,
    service: isServiceKey(r.service) ? r.service : "outro",
    city: r.city,
    cityNormalized: r.city_normalized,
    niche: isNicheKey(r.niche) ? r.niche : "restaurantes",
    showAll: r.show_all,
    lat: r.lat,
    lng: r.lng,
    radiusM: r.radius_m,
    totalFound: r.total_found,
    totalQualified: r.total_qualified,
    googleRequests: r.google_requests,
    fromCache: r.from_cache,
    sourceSearchId: r.source_search_id,
    createdAt: r.created_at,
  };
}

export function toActivity(r: Tables<"lead_activities">): Activity {
  return { id: r.id, leadId: r.lead_id, type: r.type as ActivityType, description: r.description, createdAt: r.created_at };
}

export function toTemplate(r: Tables<"message_templates">): MessageTemplate {
  return {
    id: r.id,
    service: isServiceKey(r.service) ? r.service : "outro",
    niche: isNicheKey(r.niche) ? r.niche : null,
    title: r.title,
    body: r.body,
    isDefault: r.is_default,
    updatedAt: r.updated_at,
  };
}

export const DEFAULT_SETTINGS: Settings = {
  cacheDays: 30,
  minReviewsBusy: 50,
  followUpDays: 3,
  hideContacted: true,
  signature: "[Seu nome], da Stark IA",
};

export function toSettings(r: Tables<"user_settings"> | null): Settings {
  if (!r) return DEFAULT_SETTINGS;
  return {
    cacheDays: r.cache_days,
    minReviewsBusy: r.min_reviews_busy,
    followUpDays: r.followup_days,
    hideContacted: r.hide_contacted,
    signature: r.signature,
  };
}

export function toSummary(j: unknown): DashboardSummary {
  const o = (j ?? {}) as Record<string, unknown>;
  const n = (k: string) => Number(o[k] ?? 0);
  return {
    totalLeads: n("total_leads"),
    contacted: n("contacted"),
    replied: n("replied"),
    negotiating: n("negotiating"),
    closed: n("closed"),
    closedThisMonth: n("closed_this_month"),
    followupsDue: n("followups_due"),
    followupsOverdue: n("followups_overdue"),
    funnel: (o.funnel ?? {}) as DashboardSummary["funnel"],
    googleRequestsMonth: n("google_requests_month"),
    searchesMonth: n("searches_month"),
    todayStart: String(o.today_start ?? new Date().toISOString()),
    tomorrowStart: String(o.tomorrow_start ?? new Date().toISOString()),
  };
}
