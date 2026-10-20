import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export type LoadStatus = "loading" | "ready" | "error";

/**
 * Etapa 1: simula o carregamento dos dados para exibir os skeletons.
 * Adicione ?simular=erro na URL para ver o estado de erro (o "Tentar de novo" funciona).
 * Na Etapa 2 é substituído pelas queries reais.
 */
export function useSimulatedLoad(key: string, ms = 550): { status: LoadStatus; retry: () => void } {
  const [params] = useSearchParams();
  const shouldFail = params.get("simular") === "erro";
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setStatus("loading");
    const t = window.setTimeout(() => setStatus(shouldFail && attempt === 0 ? "error" : "ready"), ms);
    return () => window.clearTimeout(t);
  }, [key, ms, shouldFail, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { status, retry };
}
