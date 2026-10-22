import type { LucideIcon } from "lucide-react";
import { Filter, Globe, Instagram, Link2, Phone, PhoneOff, Smartphone, Star } from "lucide-react";
import { formatNumber, formatRating } from "@/lib/format";
import { isOpenAt } from "@/lib/hours";
import { instagramProfileUrl } from "@/lib/links";
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

/** Conjunto padrão de tags de um lead: nota, presença online, telefone, funcionamento e "Fora do filtro". */
export function LeadTags({ lead, outsideFilter, className, now }: { lead: Lead; outsideFilter?: boolean; className?: string; now?: Date }) {
  const open = isOpenAt(lead.openingHours, now);
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {outsideFilter && (
        <LeadTag tone="danger" icon={Filter}>
          Fora do filtro
        </LeadTag>
      )}
      {lead.rating !== null && lead.reviewsCount > 0 ? (
        <LeadTag>
          <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden />
          <span className="tabular-nums text-foreground">{formatRating(lead.rating)}</span>
          <span className="tabular-nums">({formatNumber(lead.reviewsCount)})</span>
        </LeadTag>
      ) : (
        <LeadTag>Sem avaliações</LeadTag>
      )}
      {lead.websiteKind === "nenhum" && (
        <LeadTag tone="warning" icon={Globe}>
          Sem site
        </LeadTag>
      )}
      {lead.websiteKind === "rede_social" &&
        (instagramProfileUrl(lead) ? (
          <LeadTag tone="warning" icon={Instagram}>
            Só Instagram
          </LeadTag>
        ) : (
          <LeadTag tone="warning" icon={Link2}>
            Só rede social
          </LeadTag>
        ))}
      {lead.websiteKind === "site" && <LeadTag icon={Globe}>Tem site</LeadTag>}
      {lead.phoneType === "celular" && (
        <LeadTag tone="info" icon={Smartphone}>
          Celular
        </LeadTag>
      )}
      {lead.phoneType === "fixo" && <LeadTag icon={Phone}>Fixo</LeadTag>}
      {lead.phoneType === "nenhum" && <LeadTag icon={PhoneOff}>Sem telefone</LeadTag>}
      {open === true && (
        <LeadTag tone="success" dot>
          Aberto agora
        </LeadTag>
      )}
      {open === false && <LeadTag>Fechado</LeadTag>}
    </div>
  );
}
