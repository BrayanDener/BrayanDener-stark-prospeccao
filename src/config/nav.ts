import { History, House, LayoutGrid, type LucideIcon, Settings, SquareKanban, FileText, UsersRound } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const PRIMARY_NAV: NavItem[] = [
  { to: "/", label: "Início", icon: House },
  { to: "/leads", label: "Leads", icon: UsersRound },
  { to: "/crm", label: "CRM", icon: SquareKanban },
];

export const SECONDARY_NAV: NavItem[] = [
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/modelos", label: "Modelos", icon: FileText },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export const MORE_ICON = LayoutGrid;
