import { forwardRef } from "react";
import { ArrowRightLeft, CalendarClock } from "lucide-react";
import { ScoreRing } from "@/components/stark/ScoreRing";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StatusMenuItems } from "@/components/leads/StatusMenuItems";
import { getNiche } from "@/config/niches";
import { isFollowUpOverdue } from "@/lib/filters";
import { formatRelativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useUI } from "@/store/ui-store";
import type { Lead } from "@/types";

interface CrmCardProps extends React.HTMLAttributes<HTMLDivElement> {
  lead: Lead;
  score: number;
  dragging?: boolean;
  overlay?: boolean;
}

/** Card compacto do Kanban. "Mover para…" substitui o arrastar no celular. */
export const CrmCard = forwardRef<HTMLDivElement, CrmCardProps>(({ lead, score, dragging, overlay, className, ...props }, ref) => {
  const { openLead } = useUI();
  const overdue = isFollowUpOverdue(lead);
  return (
    <div
      ref={ref}
      className={cn(
        "glass relative touch-manipulation p-3 transition-[border-color,opacity,box-shadow] duration-150 hover:border-border-strong",
        dragging && "opacity-40",
        overlay && "rotate-[1.5deg] border-primary/50 shadow-2xl",
        className,
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => openLead(lead.id)}
            className="block w-full truncate text-left font-display text-sm font-semibold after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            {lead.name}
          </button>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {getNiche(lead.niche)?.label} · {lead.city}
          </p>
        </div>
        <ScoreRing score={score} size="sm" />
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        {lead.nextFollowUpAt ? (
          <span
            className={cn("inline-flex min-w-0 items-center gap-1 text-xs font-medium", overdue ? "text-warning" : "text-muted-foreground")}
            title={`Follow-up ${formatRelativeDay(lead.nextFollowUpAt)}`}
          >
            <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate first-letter:uppercase">
              {overdue ? `Atrasado · ${formatRelativeDay(lead.nextFollowUpAt).replace("há ", "")}` : formatRelativeDay(lead.nextFollowUpAt)}
            </span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Sem follow-up</span>
        )}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="relative z-10 -mr-1 h-11 shrink-0 gap-1.5 px-2.5 text-xs md:h-8"
              aria-label={`Mover ${lead.name} para outro status`}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <ArrowRightLeft className="!size-3.5" /> Mover
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <StatusMenuItems lead={lead} label="Mover para" />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
CrmCard.displayName = "CrmCard";
