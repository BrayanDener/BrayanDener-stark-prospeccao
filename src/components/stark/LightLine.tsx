import { cn } from "@/lib/utils";

/**
 * Assinatura da Stark: traço de 1px em azul com brilho suave.
 * Usar só em 3 lugares: topo do header/sidebar, título do login (sweep) e progresso do wizard.
 */
export function LightLine({ className, sweep }: { className?: string; sweep?: boolean }) {
  return <div aria-hidden className={cn("light-line pointer-events-none", sweep && "origin-left animate-light-sweep", className)} />;
}
