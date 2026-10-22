/**
 * Mensagens de WhatsApp. Variáveis: {empresa}, {nicho}, {cidade}, {servico}, {assinatura}.
 * Os textos padrão abaixo são inseridos no primeiro login (ensure_user_setup) e usados no "Restaurar padrão".
 */
import { getNiche } from "@/config/niches";
import { SERVICE_KEYS, getService } from "@/config/services";
import type { Lead, MessageTemplate, NicheKey, ServiceKey } from "@/types";

export const TEMPLATE_VARIABLES = [
  { key: "empresa", label: "Empresa" },
  { key: "nicho", label: "Nicho" },
  { key: "cidade", label: "Cidade" },
  { key: "servico", label: "Serviço" },
  { key: "assinatura", label: "Assinatura" },
] as const;

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number]["key"];

/** Acima disso a mensagem fica longa demais para um primeiro contato. */
export const MESSAGE_SOFT_LIMIT = 600;

export const DEFAULT_TEMPLATES: Record<ServiceKey, { title: string; body: string }> = {
  sites: {
    title: "Sites — primeiro contato",
    body: "Oi, tudo bem? Aqui é {assinatura}. Vi a {empresa} no Google e notei que vocês ainda não têm um site. Eu crio sites rápidos e bonitos para {nicho} aqui de {cidade}, pensados para trazer clientes pelo Google. Posso te mostrar um exemplo?",
  },
  marketing: {
    title: "Marketing — primeiro contato",
    body: "Oi, tudo bem? Aqui é {assinatura}. Encontrei a {empresa} no Google Maps e vi que dá para atrair bem mais clientes online. Trabalho com marketing digital para {nicho} em {cidade}. Posso te mandar uma ideia rápida, sem compromisso?",
  },
  automacoes: {
    title: "Automações — primeiro contato",
    body: "Oi, tudo bem? Aqui é {assinatura}. Vi que a {empresa} tem bastante movimento pelas avaliações no Google. Eu monto automações com IA que respondem clientes no WhatsApp e organizam agendamentos sozinhas. Posso te mostrar como funcionaria aí?",
  },
  apps: {
    title: "Aplicativos — primeiro contato",
    body: "Oi, tudo bem? Aqui é {assinatura}. A {empresa} parece ter bastante movimento. Eu desenvolvo sistemas e aplicativos sob medida para {nicho}, como agenda online e controle de clientes. Faz sentido conversarmos 5 minutos?",
  },
  design: {
    title: "Design — primeiro contato",
    body: "Oi, tudo bem? Aqui é {assinatura}. Conheci a {empresa} pelo Google e trabalho com design para {nicho} em {cidade}: identidade visual, cardápios, posts. Posso te mostrar alguns trabalhos?",
  },
  outro: {
    title: "Genérico — primeiro contato",
    body: "Oi, tudo bem? Aqui é {assinatura}. Conheci a {empresa} pelo Google e tenho uma ideia que pode ajudar o negócio de vocês. Posso te explicar rapidinho?",
  },
};

/** Payload do ensure_user_setup (um modelo padrão por serviço). */
export function defaultTemplatesPayload() {
  return SERVICE_KEYS.map((service) => ({ service, ...DEFAULT_TEMPLATES[service] }));
}

export function buildTemplateVars(
  lead: Pick<Lead, "name" | "city" | "niche">,
  service: ServiceKey,
  signature: string,
): Record<TemplateVariable, string> {
  return {
    empresa: lead.name,
    nicho: getNiche(lead.niche)?.keywords[0] ?? "negócios",
    cidade: lead.city,
    servico: getService(service).label.toLowerCase(),
    assinatura: signature,
  };
}

/** Troca {variavel} (e {{variavel}}) pelos valores. Desconhecidas ficam como estão, para o usuário ver. */
export function renderTemplate(body: string, vars: Partial<Record<string, string>>): string {
  return body.replace(/\{\{?\s*([a-z_]+)\s*\}?\}/gi, (match, key: string) => {
    const value = vars[key.toLowerCase()];
    return value !== undefined && value !== "" ? value : match;
  });
}

/** Regra: modelo do serviço + nicho; senão o padrão do serviço; senão o de "outro". */
export function pickTemplate(templates: MessageTemplate[], service: ServiceKey, niche: NicheKey | null): MessageTemplate | undefined {
  return (
    (niche ? templates.find((t) => t.service === service && t.niche === niche) : undefined) ??
    templates.find((t) => t.service === service && t.niche === null) ??
    templates.find((t) => t.service === "outro" && t.niche === null)
  );
}

/** Ordena os modelos com os do serviço (e nicho) do lead primeiro. */
export function sortTemplatesFor(templates: MessageTemplate[], service: ServiceKey, niche: NicheKey | null): MessageTemplate[] {
  const rank = (t: MessageTemplate) => (t.service === service ? (t.niche === niche ? 0 : t.niche === null ? 1 : 2) : 3);
  return [...templates].sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title, "pt-BR"));
}

/** Ainda tem algo para preencher (variável desconhecida ou assinatura padrão)? */
export function hasPlaceholders(message: string): boolean {
  return /\{\{?\s*[a-z_]+\s*\}?\}|\[Seu nome\]/i.test(message);
}
