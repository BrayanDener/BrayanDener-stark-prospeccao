import { Bot, Globe, Megaphone, PenTool, Shapes, Smartphone, type LucideIcon } from "lucide-react";

export type ServiceKey = "sites" | "marketing" | "automacoes" | "apps" | "design" | "outro";

export interface Service {
  key: ServiceKey;
  label: string;
  /** Linha curta exibida no card do wizard. */
  filterHint: string;
  icon: LucideIcon;
}

export const SERVICES: readonly Service[] = [
  { key: "sites", label: "Criação de Sites", filterHint: "Só empresas sem site", icon: Globe },
  { key: "marketing", label: "Marketing Digital", filterHint: "Sem site ou com poucas avaliações", icon: Megaphone },
  { key: "automacoes", label: "Automações / IA", filterHint: "Negócios movimentados, que precisam automatizar atendimento", icon: Bot },
  { key: "apps", label: "Aplicativos / Sistemas", filterHint: "Negócios movimentados, que precisam de agendamento e gestão", icon: Smartphone },
  { key: "design", label: "Design", filterHint: "Todos os resultados", icon: PenTool },
  { key: "outro", label: "Outro", filterHint: "Todos os resultados", icon: Shapes },
];

export function getService(key: string): Service {
  return SERVICES.find((s) => s.key === key) ?? SERVICES[SERVICES.length - 1];
}
