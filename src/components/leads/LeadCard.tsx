import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { ScoreRing } from "@/components/stark/ScoreRing";
import { LeadTags } from "@/components/stark/LeadTag";
import { StatusBadge } from "@/components/stark/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { isContacted } from "@/lib/filters";
import { formatDayMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useUI } from "@/store/ui-store";
import type { Lead } from "@/types";
import { LeadActions } from "./LeadActions";

interface LeadCardProps {
  lead: Lead;
  score: number;
  /** Índice para a cascata de entrada (só na primeira renderização). */
  index?: number;
  animateIn?: boolean;
  /** Não passa no filtro do serviço (exibido porque "Mostrar todos" está ligado). */
  outsideFilter?: boolean;
}

/** Endereço curto: "Rua X, 123 - Bairro" (sem cidade/UF/CEP). */
function shortAddress(address: string | null, city: string): string {
  if (!address) return city;
  const parts = address.split(",").map((p) => p.trim());
  const cut = parts.findIndex((p) => p.toLowerCase().startsWith(city.toLowerCase()));
  return (cut > 0 ? parts.slice(0, cut) : parts.slice(0, 2)).join(", ");
}

export function LeadCard({ lead, score, index = 0, animateIn, outsideFilter }: LeadCardProps) {
  const { openLead } = useUI();
  const contacted = isContacted(lead);
  return (
    <motion.article
      initial={animateIn ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut", delay: animateIn ? Math.min(index, 12) * 0.03 : 0 }}
      className={cn("glass group relative p-3.5 transition-[border-color,opacity] duration-150 hover:border-border-strong sm:p-4", contacted && "opacity-70 hover:opacity-100")}
    >
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-semibold tracking-tightish">
            <button
              type="button"
              onClick={() => openLead(lead.id)}
              className="text-left after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
            >
              {lead.name}
            </button>
          </h3>
          <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-tertiary" aria-hidden />
            <span className="truncate">{shortAddress(lead.address, lead.city)}</span>
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <StatusBadge status={lead.status} />
            {contacted && lead.lastContactAt && <span className="text-xs text-muted-foreground">Contatado em {formatDayMonth(lead.lastContactAt)}</span>}
          </div>
        </div>
        <ScoreRing score={score} size="md" />
      </div>
      <LeadTags lead={lead} outsideFilter={outsideFilter} className="mt-3" />
      <LeadActions lead={lead} className="mt-4" />
    </motion.article>
  );
}

export function LeadCardSkeleton() {
  return (
    <div className="glass p-4" aria-hidden>
      <div className="flex gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/5" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="mt-1 h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-[52px] w-[52px] rounded-full" />
      </div>
      <div className="mt-3 flex gap-1.5">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-11 flex-1" />
        <Skeleton className="h-11 w-11" />
        <Skeleton className="h-11 w-11" />
        <Skeleton className="h-11 w-11" />
      </div>
    </div>
  );
}
