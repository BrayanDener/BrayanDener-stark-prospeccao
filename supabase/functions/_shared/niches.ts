/**
 * Nichos de busca — FONTE ÚNICA, compartilhada entre o app (src/config/niches.ts)
 * e as Edge Functions (Deno). Para adicionar ou editar nichos, altere só este arquivo.
 * Sem imports: precisa rodar igual no Vite e no Deno.
 */
export const NICHES = [
  { key: "restaurantes", label: "Restaurantes", keywords: ["restaurante", "lanchonete", "pizzaria", "hamburgueria"] },
  { key: "saloes", label: "Salões de Beleza", keywords: ["salão de beleza", "cabeleireiro", "manicure", "esmalteria"] },
  { key: "barbearias", label: "Barbearias", keywords: ["barbearia", "barbeiro"] },
  { key: "oficinas", label: "Oficinas / Mecânicas", keywords: ["oficina mecânica", "auto center", "funilaria", "autoelétrica"] },
  { key: "estetica_automotiva", label: "Estética Automotiva", keywords: ["estética automotiva", "lava jato", "polimento automotivo", "martelinho de ouro"] },
  { key: "clinicas", label: "Clínicas & Consultórios", keywords: ["clínica médica", "consultório", "fisioterapia", "psicólogo"] },
  { key: "dentistas", label: "Dentistas", keywords: ["dentista", "clínica odontológica", "ortodontia"] },
  { key: "academias", label: "Academias", keywords: ["academia", "crossfit", "pilates", "estúdio de treino"] },
  { key: "farmacias", label: "Farmácias", keywords: ["farmácia", "drogaria", "farmácia de manipulação"] },
  { key: "hoteis", label: "Hotéis & Pousadas", keywords: ["hotel", "pousada", "hostel"] },
  { key: "supermercados", label: "Supermercados", keywords: ["supermercado", "mercearia", "sacolão", "hortifruti"] },
  { key: "padarias", label: "Padarias", keywords: ["padaria", "confeitaria"] },
  { key: "bares", label: "Bares", keywords: ["bar", "choperia", "boteco", "pub"] },
  { key: "escolas", label: "Escolas", keywords: ["escola particular", "curso", "escola de idiomas", "reforço escolar"] },
  { key: "advocacia", label: "Advocacia", keywords: ["escritório de advocacia", "advogado"] },
  { key: "contabilidades", label: "Contabilidades", keywords: ["escritório de contabilidade", "contador"] },
  { key: "lojas_roupa", label: "Lojas de Roupa", keywords: ["loja de roupas", "boutique", "moda feminina", "moda masculina"] },
  { key: "construcao", label: "Construção Civil", keywords: ["construtora", "material de construção", "empreiteira", "engenharia civil"] },
  { key: "pet_shops", label: "Pet shops", keywords: ["pet shop", "banho e tosa", "clínica veterinária"] },
  { key: "imobiliarias", label: "Imobiliárias", keywords: ["imobiliária", "corretor de imóveis"] },
] as const;

export type NicheKey = (typeof NICHES)[number]["key"];
export type Niche = (typeof NICHES)[number];

/** Nichos que dependem de agenda (critério extra no score de Aplicativos/Sistemas). */
export const SCHEDULING_NICHES: readonly NicheKey[] = [
  "saloes",
  "barbearias",
  "estetica_automotiva",
  "clinicas",
  "dentistas",
  "academias",
  "pet_shops",
];

export function getNiche(key: string): Niche | undefined {
  return NICHES.find((n) => n.key === key);
}
