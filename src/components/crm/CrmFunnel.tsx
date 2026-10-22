import { STATUSES } from "@/config/status";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DashboardSummary } from "@/types";

/** Mini funil por status (barras horizontais), contagens vindas do banco. */
export function CrmFunnel({ funnel }: { funnel: DashboardSummary["funnel"] | undefined }) {
  const max = Math.max(1, ...STATUSES.map((s) => funnel?.[s.key] ?? 0));
  return (
    <ul className="space-y-3">
      {STATUSES.map((s) => {
        const n = funnel?.[s.key] ?? 0;
        return (
          <li key={s.key} className="grid grid-cols-[96px_minmax(0,1fr)_40px] items-center gap-3 text-sm">
            <span className="truncate text-muted-foreground">{s.label}</span>
            <span className="h-2 overflow-hidden rounded-full bg-surface-2">
              {funnel && <span className={cn("block h-full rounded-full transition-[width] duration-700 ease-out", s.bar)} style={{ width: `${(n / max) * 100}%` }} />}
            </span>
            <span className="text-right font-semibold tabular-nums">{funnel ? formatNumber(n) : "–"}</span>
          </li>
        );
      })}
    </ul>
  );
}
