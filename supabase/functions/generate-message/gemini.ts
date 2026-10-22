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
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 30_000;

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

  let res: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      res = await fetch(`${ENDPOINT}/${encodeURIComponent(opts.model)}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": opts.apiKey },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      console.error("[generate-message] falha de rede/timeout", (err as Error).name);
      res = null;
    }
    // Repete uma vez só em sobrecarga (5xx) ou falha de rede.
    if (res && res.status < 500) break;
  }

  if (!res) throw new AiError("AI_UNAVAILABLE");
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[generate-message] erro do Gemini", res.status, detail.slice(0, 300));
    throw errorForStatus(res.status);
  }

  const data = (await res.json()) as GeminiResponse;
  return { text: extractText(data), model: data.modelVersion ?? opts.model };
}
