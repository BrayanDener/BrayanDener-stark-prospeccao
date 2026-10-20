import { getStatus } from "@/config/status";
import type { LeadStatus } from "@/types";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  const s = getStatus(status);
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium transition-colors duration-150",
        s.badge,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full transition-colors duration-150", s.dot)} aria-hidden />
      {s.label}
    </span>
  );
}
