/**
 * Chamada ao Gemini (Google AI Studio, plano grátis) pela API REST.
 * A chave vem do secret AI_API_KEY e vai só no cabeçalho; nunca aparece em log.
 */
/** Erro da IA já com o código do app; o index.ts converte em resposta HTTP. Sem dependências: testável no Vitest. */
export class AiError extends Error {
  constructor(public code: "AI_UNAVAILABLE" | "AI_NOT_CONFIGURED", message?: string) {
    super(message ?? "");
    this.name = "AiError";
  }
}

/** "gemini-flash-latest" sempre aponta para o Flash atual. Dá para fixar outro pelo secret AI_MODEL. */
export const DEFAULT_MODEL = "gemini-flash-latest";
/** Reserva mais leve e rápida, usada quando o principal está sobrecarregado, lento ou sem cota. */
export const FALLBACK_MODEL = "gemini-flash-lite-latest";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 20_000;

/** Ordem de tentativas: principal → reserva → principal de novo (após uma pausa curta). */
export function modelChain(primary: string): string[] {
  return primary === FALLBACK_MODEL ? [primary, primary] : [primary, FALLBACK_MODEL, primary];
}

/** Erros que valem tentar outro modelo: sobrecarga, cota do modelo, modelo inexistente, falha de rede. */
export function shouldTryNext(status: number | null): boolean {
  return status === null || status === 404 || status === 429 || status >= 500;
}

interface GeminiPart {
  text?: string;
  thought?: boolean;
}

export interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  modelVersion?: string;
}

/** Junta o texto da resposta, ignorando partes de raciocínio. Lança AI_UNAVAILABLE se veio bloqueada ou vazia. */
export function extractText(data: GeminiResponse): string {
  if (data.promptFeedback?.blockReason) {
    console.error("[generate-message] pedido bloqueado", data.promptFeedback.blockReason);
    throw new AiError("AI_UNAVAILABLE", "A IA não quis gerar essa mensagem. Use o modelo pronto ou escreva a sua.");
  }
  const candidate = data.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text)
    .join("")
    .trim();
  if (!text) {
    console.error("[generate-message] resposta vazia", candidate?.finishReason);
    throw new AiError("AI_UNAVAILABLE");
  }
  return text;
}

/** Converte o status HTTP do Gemini no erro amigável do app. */
export function errorForStatus(status: number): AiError {
  if (status === 400 || status === 401 || status === 403) {
    return new AiError("AI_NOT_CONFIGURED", "A chave AI_API_KEY foi recusada pelo Gemini. Confira o secret no Supabase.");
  }
  if (status === 404) {
    return new AiError("AI_NOT_CONFIGURED", "O modelo de IA configurado não existe mais. Ajuste o secret AI_MODEL ou apague-o.");
  }
  if (status === 429) {
    return new AiError("AI_UNAVAILABLE", "Limite grátis da IA atingido por agora. Espere um pouco e tente de novo.");
  }
  return new AiError("AI_UNAVAILABLE");
}

export async function generateWithGemini(opts: { apiKey: string; model: string; system: string; prompt: string }): Promise<{ text: string; model: string }> {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
    // Folga para modelos que pensam antes de responder; o texto final é cortado em 350 caracteres depois.
    generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
  });

  const chain = modelChain(opts.model);
  let lastStatus: number | null = null;
  for (let i = 0; i < chain.length; i++) {
    const model = chain[i];
    if (i === chain.length - 1 && i > 0) await new Promise((r) => setTimeout(r, 1500));

    let res: Response;
    try {
      res = await fetch(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": opts.apiKey },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      console.error(`[generate-message] ${model}: falha de rede/timeout`, (err as Error).name);
      lastStatus = null;
      continue;
    }

    if (res.ok) {
      const data = (await res.json()) as GeminiResponse;
      return { text: extractText(data), model: data.modelVersion ?? model };
    }

    const detail = await res.text().catch(() => "");
    console.error(`[generate-message] ${model}: erro do Gemini`, res.status, detail.slice(0, 200));
    lastStatus = res.status;
    // Chave recusada (400/401/403) não melhora trocando de modelo.
    if (!shouldTryNext(res.status)) break;
  }

  throw lastStatus === null ? new AiError("AI_UNAVAILABLE", "A IA do Google está lenta agora. Tente de novo em instantes.") : errorForStatus(lastStatus);
}
