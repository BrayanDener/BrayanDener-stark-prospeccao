import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  accent?: boolean;
  className?: string;
}

export function MetricCard({ label, value, icon: Icon, hint, accent, className }: MetricCardProps) {
  return (
    <div className={cn("glass flex min-w-0 flex-col gap-3 p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm text-muted-foreground">{label}</span>
        {Icon && (
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-2", accent ? "text-primary" : "text-tertiary")}>
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>
      <div>
        <div className="font-display text-2xl font-bold tabular-nums tracking-tighter md:text-3xl">{value}</div>
        {hint && <div className="mt-1 truncate text-xs text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}

export function MetricCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("glass flex flex-col gap-3 p-4", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8" />
      </div>
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}
