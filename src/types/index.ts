import type { NicheKey } from "@/config/niches";
import type { LeadStatus } from "@/config/status";
import type { PhoneType } from "../../supabase/functions/_shared/phone";
import type { ServiceKey } from "../../supabase/functions/_shared/services";
import type { WebsiteKind } from "../../supabase/functions/_shared/website";

export type { LeadStatus, NicheKey, PhoneType, ServiceKey, WebsiteKind };

/** Período do Google Places: day 0 = domingo. Sem `close` = aberto 24h. */
export interface OpeningPeriod {
  open: { day: number; hour: number; minute: number };
  close?: { day: number; hour: number; minute: number };
}

export interface OpeningHours {
  periods: OpeningPeriod[];
  /** Ex.: "segunda-feira: 09:00 – 18:00" (já em pt-BR, segunda → domingo). */
  weekdayDescriptions: string[];
}

/** Lead + status do CRM (view v_leads). */
export interface Lead {
  id: string;
  placeId: string;
  name: string;
  address: string | null;
  city: string;
  niche: NicheKey;
  phoneNational: string | null;
  phoneE164: string | null;
  phoneType: PhoneType;
  website: string | null;
  websiteKind: WebsiteKind;
  rating: number | null;
  reviewsCount: number;
  openingHours: OpeningHours | null;
  types: string[];
  primaryType: string | null;
  lat: number | null;
  lng: number | null;
  googleMapsUri: string | null;
  businessStatus: string | null;
  firstSeenAt: string;
  lastFetchedAt: string;
  status: LeadStatus;
  notes: string;
  lastContactAt: string | null;
  repliedAt: string | null;
  followUpAt: string | null;
  closedAt: string | null;
  statusUpdatedAt: string | null;
  /** Serviço da busca mais recente que encontrou o lead (usado no score fora de uma busca). */
  lastService: ServiceKey | null;
}

export interface Search {
  id: string;
  service: ServiceKey;
  city: string;
  cityNormalized: string;
  niche: NicheKey;
  showAll: boolean;
  lat: number | null;
  lng: number | null;
  radiusM: number | null;
  totalFound: number;
  totalQualified: number;
  googleRequests: number;
  fromCache: boolean;
  sourceSearchId: string | null;
  createdAt: string;
}

export interface SearchParams {
  service: ServiceKey;
  city: string;
  niche: NicheKey;
  showAll: boolean;
}

export type ActivityType = "status" | "whatsapp" | "ligacao" | "nota" | "followup";

export interface Activity {
  id: string;
  leadId: string;
  type: ActivityType;
  description: string;
  createdAt: string;
}

export interface MessageTemplate {
  id: string;
  service: ServiceKey;
  niche: NicheKey | null;
  title: string;
  body: string;
  isDefault: boolean;
  updatedAt: string;
}

export interface Settings {
  cacheDays: number;
  minReviewsBusy: number;
  followUpDays: number;
  hideContacted: boolean;
  signature: string;
}

export interface DashboardSummary {
  totalLeads: number;
  contacted: number;
  replied: number;
  negotiating: number;
  closed: number;
  closedThisMonth: number;
  followupsDue: number;
  followupsOverdue: number;
  funnel: Partial<Record<LeadStatus, number>>;
  googleRequestsMonth: number;
  searchesMonth: number;
  todayStart: string;
  tomorrowStart: string;
}

/** Estado anterior devolvido pelas funções do CRM, para o "Desfazer". */
export interface UndoToken {
  leadId: string;
  previous: Record<string, unknown>;
  activityIds: string[];
  changed: boolean;
}
