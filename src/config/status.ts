export type LeadStatus = "novo" | "contatado" | "respondeu" | "negociando" | "fechado" | "sem_interesse";

export interface StatusConfig {
  key: LeadStatus;
  label: string;
  /** Classes do badge (texto + fundo + ponto). */
  badge: string;
  dot: string;
  /** Cor usada em barras (funil). */
  bar: string;
}

export const STATUSES: readonly StatusConfig[] = [
  { key: "novo", label: "Novo", badge: "bg-muted-foreground/15 text-muted-foreground", dot: "bg-muted-foreground", bar: "bg-muted-foreground/70" },
  { key: "contatado", label: "Contatado", badge: "bg-primary/15 text-primary-hover", dot: "bg-primary", bar: "bg-primary" },
  { key: "respondeu", label: "Respondeu", badge: "bg-violet/15 text-violet", dot: "bg-violet", bar: "bg-violet/80" },
  { key: "negociando", label: "Negociando", badge: "bg-warning/15 text-warning", dot: "bg-warning", bar: "bg-warning/90" },
  { key: "fechado", label: "Fechado", badge: "bg-success/15 text-success", dot: "bg-success", bar: "bg-success" },
  { key: "sem_interesse", label: "Sem interesse", badge: "bg-danger/10 text-[#F0A3A3]", dot: "bg-danger/60", bar: "bg-danger/50" },
];

export function getStatus(key: LeadStatus): StatusConfig {
  return STATUSES.find((s) => s.key === key) ?? STATUSES[0];
}
