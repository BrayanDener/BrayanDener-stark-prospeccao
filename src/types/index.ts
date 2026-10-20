import type { NicheKey } from "@/config/niches";
import type { ServiceKey } from "@/config/services";
import type { LeadStatus } from "@/config/status";

export type { NicheKey, ServiceKey, LeadStatus };

/** 0 = domingo … 6 = sábado. Horários "HH:MM"; close menor que open = vira a madrugada. */
export interface DayHours {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  open: string;
  close: string;
}
export type WeeklyHours = DayHours[];

export type ActivityType = "busca" | "status" | "whatsapp" | "ligacao" | "nota" | "followup";

export interface Activity {
  id: string;
  type: ActivityType;
  text: string;
  at: string; // ISO
}

export interface Note {
  id: string;
  text: string;
  at: string; // ISO
}

export interface Lead {
  id: string;
  searchId: string;
  /** Serviço da busca que encontrou o lead (define o score). */
  service: ServiceKey;
  niche: NicheKey;
  name: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  phone: string | null;
  /** Site informado no Google. Pode ser um link de rede social. */
  website: string | null;
  instagram: string | null;
  rating: number | null;
  reviewCount: number;
  hours: WeeklyHours | null;
  status: LeadStatus;
  /** Lead salvo no pipeline do CRM (resultados de busca entram ao mudar status ou salvar). */
  inCrm: boolean;
  lastContactAt: string | null;
  nextFollowUpAt: string | null;
  notes: Note[];
  activities: Activity[];
  createdAt: string;
}

export interface Search {
  id: string;
  service: ServiceKey;
  city: string;
  niche: NicheKey;
  ignoreFilter: boolean;
  createdAt: string;
}

export interface SearchParams {
  service: ServiceKey;
  city: string;
  niche: NicheKey;
  ignoreFilter: boolean;
}

export interface MessageTemplate {
  id: string;
  service: ServiceKey;
  name: string;
  body: string;
  updatedAt: string;
}

export interface Settings {
  cacheDays: number;
  minReviews: number;
  followUpDays: number;
  hideContacted: boolean;
  signature: string;
}
