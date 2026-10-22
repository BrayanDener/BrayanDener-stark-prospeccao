import { describe, expect, it } from "vitest";
import type { MessageTemplate } from "@/types";
import { DEFAULT_TEMPLATES, buildTemplateVars, defaultTemplatesPayload, hasPlaceholders, pickTemplate, renderTemplate } from "./messages";

const tpl = (p: Partial<MessageTemplate> & { id: string }): MessageTemplate => ({ service: "sites", niche: null, title: p.id, body: "", isDefault: false, updatedAt: "", ...p });

describe("mensagens", () => {
  it("troca {variaveis} (e {{variaveis}}) e mantém as desconhecidas", () => {
    expect(renderTemplate("Oi {empresa}, {{ cidade }}! {xyz}", { empresa: "Dom Bigode", cidade: "Itabira" })).toBe("Oi Dom Bigode, Itabira! {xyz}");
  });
  it("monta as variáveis do lead e do serviço", () => {
    const vars = buildTemplateVars({ name: "Dom Bigode", city: "Itabira", niche: "barbearias" }, "sites", "Brayan, da Stark IA");
    expect(vars).toEqual({ empresa: "Dom Bigode", nicho: "barbearia", cidade: "Itabira", servico: "criação de sites", assinatura: "Brayan, da Stark IA" });
  });
  it("texto padrão de Sites fica natural com a assinatura", () => {
    const vars = buildTemplateVars({ name: "Barbearia Guerra", city: "Itabira", niche: "barbearias" }, "sites", "Brayan, da Stark IA");
    expect(renderTemplate(DEFAULT_TEMPLATES.sites.body, vars)).toBe(
      "Oi, tudo bem? Aqui é Brayan, da Stark IA. Vi a Barbearia Guerra no Google e notei que vocês ainda não têm um site. Eu crio sites rápidos e bonitos para barbearia aqui de Itabira, pensados para trazer clientes pelo Google. Posso te mostrar um exemplo?",
    );
  });
  it("escolha: serviço + nicho, senão o padrão do serviço, senão 'outro'", () => {
    const list = [tpl({ id: "sites" }), tpl({ id: "sites-barb", niche: "barbearias" }), tpl({ id: "outro", service: "outro" })];
    expect(pickTemplate(list, "sites", "barbearias")?.id).toBe("sites-barb");
    expect(pickTemplate(list, "sites", "padarias")?.id).toBe("sites");
    expect(pickTemplate(list, "apps", "barbearias")?.id).toBe("outro");
  });
  it("6 modelos padrão, um por serviço, todos com uma pergunta no final", () => {
    const payload = defaultTemplatesPayload();
    expect(payload).toHaveLength(6);
    for (const t of payload) expect(t.body.trim().endsWith("?")).toBe(true);
  });
  it("detecta campos pendentes", () => {
    expect(hasPlaceholders("Aqui é [Seu nome], da Stark IA")).toBe(true);
    expect(hasPlaceholders("Oi {empresa}")).toBe(true);
    expect(hasPlaceholders("Oi, tudo bem?")).toBe(false);
  });
});
