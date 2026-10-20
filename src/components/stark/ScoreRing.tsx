import { motion } from "framer-motion";
import { scoreTone, type ScoreTone } from "@/lib/score";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { px: 40, stroke: 3.5, text: "text-xs" },
  md: { px: 52, stroke: 4, text: "text-sm" },
  lg: { px: 76, stroke: 5, text: "text-xl" },
} as const;

const TONE: Record<ScoreTone, string> = {
  high: "text-success",
  mid: "text-primary",
  low: "text-warning",
  min: "text-muted-foreground/70",
};

interface ScoreRingProps {
  score: number;
  size?: keyof typeof SIZES;
  className?: string;
}

/** Anel 0–100 que se preenche em 600ms. ≥75 verde · 50–74 azul · 30–49 âmbar · <30 cinza. */
export function ScoreRing({ score, size = "md", className }: ScoreRingProps) {
  const { px, stroke, text } = SIZES[size];
  const r = (px - stroke) / 2;
  const value = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <div
      role="img"
      aria-label={`Score ${value} de 100`}
      className={cn("relative inline-flex shrink-0 items-center justify-center", TONE[scoreTone(value)], className)}
      style={{ width: px, height: px }}
    >
      <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} className="-rotate-90">
        <circle cx={px / 2} cy={px / 2} r={r} fill="none" stroke="hsl(var(--surface-2))" strokeWidth={stroke} />
        {value > 0 && (
          <motion.circle
            cx={px / 2}
            cy={px / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: value / 100 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
      </svg>
      <span className={cn("absolute font-display font-bold tabular-nums tracking-tightish text-foreground", text)}>{value}</span>
    </div>
  );
}
