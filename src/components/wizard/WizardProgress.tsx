import { motion } from "framer-motion";

/** Barra de 3 segmentos que se preenchem em azul (linha de luz da Stark). */
export function WizardProgress({ step, total = 3 }: { step: number; total?: number }) {
  return (
    <div className="mt-3 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }} role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step} aria-label={`Passo ${step} de ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="h-1 overflow-hidden rounded-full bg-surface-2">
          <motion.div
            className="h-full rounded-full bg-primary"
            style={{ boxShadow: "0 0 10px 0 hsl(var(--primary) / 0.6)" }}
            initial={false}
            animate={{ width: i < step ? "100%" : "0%" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      ))}
    </div>
  );
}
