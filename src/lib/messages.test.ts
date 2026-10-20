import { describe, expect, it } from "vitest";
import { buildTemplateVars, pickTemplate, renderTemplate } from "./messages";
import { MOCK_TEMPLATES } from "@/mocks/templates";

describe("messages", () => {
  it("troca variáveis e mantém as desconhecidas", () => {
    expect(renderTemplate("Oi {{empresa}}, {{ cidade }}! {{xyz}}", { empresa: "Dom Bigode", cidade: "Itabira" })).toBe("Oi Dom Bigode, Itabira! {{xyz}}");
  });
  it("monta variáveis a partir do lead", () => {
    const vars = buildTemplateVars({ name: "Dom Bigode", city: "Itabira", niche: "barbearias", rating: 4.8, reviewCount: 1284 }, "Brayan, da Stark IA");
    expect(vars).toMatchObject({ empresa: "Dom Bigode", nicho: "barbearia", nota: "4,8", avaliacoes: "1.284", assinatura: "Brayan, da Stark IA" });
  });
  it("escolhe o modelo do serviço, senão o genérico", () => {
    expect(pickTemplate(MOCK_TEMPLATES, "apps")?.service).toBe("apps");
    expect(pickTemplate(MOCK_TEMPLATES.filter((t) => t.service !== "marketing"), "marketing")?.service).toBe("outro");
  });
});
