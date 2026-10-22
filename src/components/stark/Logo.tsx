import { cn } from "@/lib/utils";

/** Marca: "S" geométrico em placa marinho com um ponto de luz. */
export function LogoMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden className={cn("shrink-0", className)}>
      <rect x="0.5" y="0.5" width="31" height="31" rx="9" fill="#0B1A2E" stroke="rgba(148,178,230,0.22)" />
      <path
        d="M21.5 10.75c-.9-1.35-2.75-2.25-5.05-2.25-3.05 0-5.2 1.5-5.2 3.75 0 2.4 2.15 3.15 5 3.75 2.85.6 5.25 1.35 5.25 3.95 0 2.35-2.25 3.8-5.4 3.8-2.5 0-4.45-.95-5.35-2.5"
        stroke="#EEF3FA"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="23.25" cy="8.75" r="1.6" fill="#3B82F6" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && (
        <div className="leading-none">
          <div className="font-display text-[15px] font-extrabold tracking-tighter">Stark</div>
          <div className="mt-0.5 text-xs text-muted-foreground">Prospecção</div>
        </div>
      )}
    </div>
  );
}
