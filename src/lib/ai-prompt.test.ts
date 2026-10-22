import { describe, expect, it } from "vitest";
import { MAX_CHARS, buildUserPrompt, cleanMessage } from "../../supabase/functions/generate-message/prompt";

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
