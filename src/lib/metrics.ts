import { STATUSES } from "@/config/status";
import type { Lead, LeadStatus } from "@/types";
import { isFollowUpDue } from "./filters";

const RESPONDED: LeadStatus[] = ["respondeu", "negociando", "fechado"];

export interface DashboardMetrics {
  total: number;
  contacted: number;
  negotiating: number;
  closed: number;
  /** 0–1. Respostas ÷ contatados. */
  responseRate: number;
}

export function computeMetrics(leads: Lead[]): DashboardMetrics {
  const contacted = leads.filter((l) => l.status !== "novo").length;
  const responded = leads.filter((l) => RESPONDED.includes(l.status)).length;
  return {
    total: leads.length,
    contacted,
    negotiating: leads.filter((l) => l.status === "negociando").length,
    closed: leads.filter((l) => l.status === "fechado").length,
    responseRate: contacted === 0 ? 0 : responded / contacted,
  };
}

export function countByStatus(leads: Lead[]): Record<LeadStatus, number> {
  const counts = Object.fromEntries(STATUSES.map((s) => [s.key, 0])) as Record<LeadStatus, number>;
  for (const l of leads) counts[l.status] += 1;
  return counts;
}

/** Follow-ups de hoje + atrasados, mais antigos primeiro. */
export function dueFollowUps(leads: Lead[], now: Date = new Date()): Lead[] {
  return leads
    .filter((l) => isFollowUpDue(l, now))
    .sort((a, b) => new Date(a.nextFollowUpAt!).getTime() - new Date(b.nextFollowUpAt!).getTime());
}
