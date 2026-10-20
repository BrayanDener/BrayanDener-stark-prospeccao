import { getNiche } from "@/config/niches";
import type { Lead, MessageTemplate, ServiceKey } from "@/types";
import { formatNumber, formatRating } from "./format";

export const TEMPLATE_VARIABLES = [
  { key: "empresa", label: "Empresa" },
  { key: "cidade", label: "Cidade" },
  { key: "nicho", label: "Nicho" },
  { key: "nota", label: "Nota" },
  { key: "avaliacoes", label: "Nº de avaliações" },
  { key: "assinatura", label: "Assinatura" },
] as const;

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number]["key"];

/** Acima disso a mensagem fica longa demais para um primeiro contato. */
export const MESSAGE_SOFT_LIMIT = 700;

export function buildTemplateVars(
  lead: Pick<Lead, "name" | "city" | "niche" | "rating" | "reviewCount">,
  signature: string,
): Record<TemplateVariable, string> {
  return {
    empresa: lead.name,
    cidade: lead.city,
    nicho: getNiche(lead.niche)?.keywords[0] ?? "negócio",
    nota: lead.rating !== null ? formatRating(lead.rating) : "",
    avaliacoes: formatNumber(lead.reviewCount),
    assinatura: signature,
  };
}

/** Troca {{variavel}} pelos valores. Variáveis desconhecidas ficam como estão, para o usuário ver. */
export function renderTemplate(body: string, vars: Partial<Record<string, string>>): string {
  return body.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (match, key: string) => {
    const value = vars[key.toLowerCase()];
    return value !== undefined && value !== "" ? value : match;
  });
}

/** Modelo padrão para um serviço: o primeiro do serviço, senão o primeiro de "outro", senão o primeiro. */
export function pickTemplate(templates: MessageTemplate[], service: ServiceKey): MessageTemplate | undefined {
  return templates.find((t) => t.service === service) ?? templates.find((t) => t.service === "outro") ?? templates[0];
}

/** Ordena os modelos deixando os do serviço do lead primeiro. */
export function sortTemplatesFor(templates: MessageTemplate[], service: ServiceKey): MessageTemplate[] {
  return [...templates].sort((a, b) => Number(b.service === service) - Number(a.service === service));
}
