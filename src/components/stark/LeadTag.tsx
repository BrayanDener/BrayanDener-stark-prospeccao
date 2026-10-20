import type { LucideIcon } from "lucide-react";
import { Globe, Instagram, Phone, PhoneOff, Smartphone, Star } from "lucide-react";
import { formatNumber, formatRating } from "@/lib/format";
import { getWebPresence } from "@/lib/filters";
import { isOpenAt } from "@/lib/hours";
import { phoneKind } from "@/lib/phone";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types";

type Tone = "neutral" | "success" | "warning" | "info" | "danger";

const TONES: Record<Tone, string> = {
  neutral: "border border-border bg-surface-2/70 text-muted-foreground",
  success: "bg-success/12 text-success",
  warning: "bg-warning/12 text-warning",
  info: "bg-primary-muted text-primary-hover",
  danger: "bg-danger/10 text-[#F0A3A3]",
};

interface LeadTagProps {
  children: React.ReactNode;
  tone?: Tone;
  icon?: LucideIcon;
  dot?: boolean;
  className?: string;
}

/** Etiqueta curta de atributo do lead ("Sem site", "Celular", "Aberto agora"…). */
export function LeadTag({ children, tone = "neutral", icon: Icon, dot, className }: LeadTagProps) {
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-xs font-medium", TONES[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
      {children}
    </span>
  );
}

/** Conjunto padrão de tags de um lead: nota, presença online, telefone e funcionamento. */
export function LeadTags({ lead, className, now }: { lead: Lead; className?: string; now?: Date }) {
  const presence = getWebPresence(lead);
  const phone = phoneKind(lead.phone);
  const open = isOpenAt(lead.hours, now);
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {lead.rating !== null ? (
        <LeadTag>
          <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden />
          <span className="tabular-nums text-foreground">{formatRating(lead.rating)}</span>
          <span className="tabular-nums">({formatNumber(lead.reviewCount)})</span>
        </LeadTag>
      ) : (
        <LeadTag>Sem avaliações</LeadTag>
      )}
      {presence === "none" && <LeadTag tone="warning" icon={Globe}>Sem site</LeadTag>}
      {presence === "social" && <LeadTag tone="warning" icon={Instagram}>Só Instagram</LeadTag>}
      {presence === "site" && <LeadTag icon={Globe}>Tem site</LeadTag>}
      {phone === "celular" && <LeadTag tone="info" icon={Smartphone}>Celular</LeadTag>}
      {phone === "fixo" && <LeadTag icon={Phone}>Fixo</LeadTag>}
      {phone === "nenhum" && <LeadTag icon={PhoneOff}>Sem telefone</LeadTag>}
      {open === true && <LeadTag tone="success" dot>Aberto agora</LeadTag>}
      {open === false && <LeadTag>Fechado</LeadTag>}
    </div>
  );
}
