/** Chaves dos serviços — fonte única para o app e as Edge Functions. */
export const SERVICE_KEYS = ["sites", "marketing", "automacoes", "apps", "design", "outro"] as const;
export type ServiceKey = (typeof SERVICE_KEYS)[number];

export const SERVICE_LABELS: Record<ServiceKey, string> = {
  sites: "Criação de Sites",
  marketing: "Marketing Digital",
  automacoes: "Automações / IA",
  apps: "Aplicativos / Sistemas",
  design: "Design",
  outro: "Outro",
};

export function isServiceKey(value: unknown): value is ServiceKey {
  return typeof value === "string" && (SERVICE_KEYS as readonly string[]).includes(value);
}
