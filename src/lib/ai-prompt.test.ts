import { describe, expect, it } from "vitest";
import { MAX_CHARS, buildUserPrompt, cleanMessage } from "../../supabase/functions/generate-message/prompt";
import { AiError, FALLBACK_MODEL, errorForStatus, extractText, modelChain, shouldTryNext } from "../../supabase/functions/generate-message/gemini";


describe("prompt da IA (generate-message)", () => {
  const lead = { name: "Barbearia Guerra", city: "Itabira", niche: "barbearias", rating: 5, reviews_count: 134, website_kind: "nenhum" as const };
  it("leva só os fatos do banco, separados como dados", () => {
    const p = buildUserPrompt(lead, "sites", "amigavel", "Brayan, da Stark IA");
    expect(p).toContain("<dados_do_negocio>");
    expect(p).toContain("Nome do negócio: Barbearia Guerra");
    expect(p).toContain("Presença online: não tem site");
    expect(p).toContain("nota 5,0 com 134 avaliações");
    expect(p).toContain("Assinatura: Brayan, da Stark IA");
  });
  it("limpa aspas e rótulos e respeita o limite de caracteres", () => {
    expect(cleanMessage('Mensagem: "Oi, tudo bem?"')).toBe("Oi, tudo bem?");
    const long = `${"Frase curta e simpática. ".repeat(20)}Posso te mostrar?`;
    const out = cleanMessage(long);
    expect(out.length).toBeLessThanOrEqual(MAX_CHARS);
    expect(out.endsWith(".")).toBe(true);
  });
});

describe("resposta do Gemini (generate-message)", () => {
  it("junta o texto e ignora partes de raciocínio", () => {
    const text = extractText({
      candidates: [{ content: { parts: [{ text: "pensando...", thought: true }, { text: " Oi, tudo bem? " }] }, finishReason: "STOP" }],
    });
    expect(text).toBe("Oi, tudo bem?");
  });

  it("falha com AI_UNAVAILABLE se veio bloqueada ou vazia", () => {
    expect(() => extractText({ promptFeedback: { blockReason: "SAFETY" } })).toThrow(AiError);
    expect(() => extractText({ candidates: [{ finishReason: "MAX_TOKENS" }] })).toThrow(AiError);
  });

  it("traduz o status HTTP no erro do app", () => {
    expect(errorForStatus(400).code).toBe("AI_NOT_CONFIGURED");
    expect(errorForStatus(403).code).toBe("AI_NOT_CONFIGURED");
    expect(errorForStatus(404).code).toBe("AI_NOT_CONFIGURED");
    expect(errorForStatus(429).code).toBe("AI_UNAVAILABLE");
    expect(errorForStatus(503).code).toBe("AI_UNAVAILABLE");
  });
});

describe("reserva de modelo do Gemini", () => {
  it("tenta principal, reserva e principal de novo", () => {
    expect(modelChain("gemini-flash-latest")).toEqual(["gemini-flash-latest", FALLBACK_MODEL, "gemini-flash-latest"]);
    expect(modelChain(FALLBACK_MODEL)).toEqual([FALLBACK_MODEL, FALLBACK_MODEL]);
  });

  it("só troca de modelo em sobrecarga, cota, modelo inexistente ou rede", () => {
    expect(shouldTryNext(503)).toBe(true);
    expect(shouldTryNext(429)).toBe(true);
    expect(shouldTryNext(404)).toBe(true);
    expect(shouldTryNext(null)).toBe(true);
    expect(shouldTryNext(400)).toBe(false);
    expect(shouldTryNext(403)).toBe(false);
  });
});
