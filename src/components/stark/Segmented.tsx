import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: LucideIcon }[];
  label: string;
  /** Esconde o texto abaixo de 640px (só ícone). */
  iconOnlyMobile?: boolean;
  className?: string;
}

/** Alternador compacto (Lista/Mapa, Kanban/Lista). */
export function Segmented<T extends string>({ value, onChange, options, label, iconOnlyMobile, className }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex h-11 shrink-0 items-center rounded-md border border-border-strong bg-surface p-1 md:h-9", className)}>
      {options.map((o) => {
        const active = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex h-full min-w-11 items-center justify-center gap-1.5 rounded-[7px] px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active ? "bg-surface-2 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon && <Icon className="h-4 w-4" aria-hidden />}
            <span className={cn(iconOnlyMobile && "sr-only sm:not-sr-only")}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
