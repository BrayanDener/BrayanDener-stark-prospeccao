import { Bot, Globe, Megaphone, PenTool, Shapes, Smartphone, type LucideIcon } from "lucide-react";
import { SERVICE_KEYS, SERVICE_LABELS, isServiceKey, type ServiceKey } from "../../supabase/functions/_shared/services";

export { SERVICE_KEYS, isServiceKey, type ServiceKey };

export interface Service {
  key: ServiceKey;
  label: string;
  /** Linha curta exibida no card do wizard. */
  filterHint: string;
  icon: LucideIcon;
}

const META: Record<ServiceKey, { filterHint: string; icon: LucideIcon }> = {
  sites: { filterHint: "Só empresas sem site", icon: Globe },
  marketing: { filterHint: "Sem site ou com poucas avaliações", icon: Megaphone },
  automacoes: { filterHint: "Negócios movimentados, que precisam automatizar atendimento", icon: Bot },
  apps: { filterHint: "Negócios movimentados, que precisam de agendamento e gestão", icon: Smartphone },
  design: { filterHint: "Todos os resultados", icon: PenTool },
  outro: { filterHint: "Todos os resultados", icon: Shapes },
};

export const SERVICES: readonly Service[] = SERVICE_KEYS.map((key) => ({ key, label: SERVICE_LABELS[key], ...META[key] }));

export function getService(key: string | null | undefined): Service {
  return SERVICES.find((s) => s.key === key) ?? SERVICES[SERVICES.length - 1];
}
