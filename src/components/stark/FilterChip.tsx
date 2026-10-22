import { forwardRef } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active: boolean;
  showCheck?: boolean;
}

/** Chip de alternância (filtros, nichos, cidades recentes). Alvo de toque de 44px no celular. */
export const FilterChip = forwardRef<HTMLButtonElement, FilterChipProps>(({ active, showCheck = true, className, children, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    aria-pressed={props.role ? undefined : active}
    className={cn(
      "inline-flex h-11 shrink-0 select-none items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-[background-color,border-color,color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:active:scale-[0.98] md:h-9",
      active
        ? "border-primary/70 bg-primary-muted text-foreground"
        : "border-border-strong bg-surface text-muted-foreground hover:border-primary/40 hover:text-foreground",
      className,
    )}
    {...props}
  >
    {active && showCheck && <Check className="h-4 w-4 text-primary" aria-hidden />}
    {children}
  </button>
));
FilterChip.displayName = "FilterChip";
