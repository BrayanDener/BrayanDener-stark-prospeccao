import type { Lead, NicheKey, SearchParams } from "@/types";
import { createRandom } from "@/lib/random";
import { NICHE_HOURS } from "./hours";

/** Prefixos de nome de negócio por nicho. */
const PREFIXES: Record<NicheKey, string[]> = {
  restaurantes: ["Restaurante", "Pizzaria", "Hamburgueria", "Lanchonete", "Cantina"],
  saloes: ["Salão", "Studio", "Espaço", "Esmalteria"],
  barbearias: ["Barbearia", "Barbearia", "Barber Club"],
  oficinas: ["Oficina", "Auto Center", "Funilaria", "Autoelétrica", "Mecânica"],
  estetica_automotiva: ["Lava Jato", "Estética Automotiva", "Car Wash", "Martelinho de Ouro"],
  clinicas: ["Clínica", "Consultório", "Fisioterapia", "Clínica Integrada"],
  dentistas: ["Odonto", "Clínica Odontológica", "Ortodontia"],
  academias: ["Academia", "CrossFit", "Pilates", "Studio Fitness"],
  farmacias: ["Farmácia", "Drogaria", "Farmácia de Manipulação"],
  hoteis: ["Hotel", "Pousada", "Hostel"],
  supermercados: ["Supermercado", "Mercearia", "Sacolão", "Hortifruti"],
  padarias: ["Padaria", "Confeitaria", "Panificadora"],
  bares: ["Bar", "Choperia", "Boteco", "Pub"],
  escolas: ["Colégio", "Escola", "Curso", "Escola de Idiomas"],
  advocacia: ["Advocacia", "Escritório de Advocacia"],
  contabilidades: ["Contabilidade", "Escritório Contábil"],
  lojas_roupa: ["Boutique", "Moda", "Loja", "Ateliê"],
  construcao: ["Construtora", "Material de Construção", "Depósito", "Engenharia"],
  pet_shops: ["Pet Shop", "Banho e Tosa", "Clínica Veterinária"],
  imobiliarias: ["Imobiliária", "Imóveis"],
};

/** Nichos em que o nome costuma ser um sobrenome ("Contabilidade Moreira"). */
const SURNAME_NICHES: NicheKey[] = ["advocacia", "contabilidades", "construcao", "imobiliarias", "clinicas", "dentistas"];

const PLACE_NAMES = [
  "Santa Luzia", "Bom Jesus", "Central", "Estrela", "Real", "Primavera", "São José", "Nova Era", "Boa Vista",
  "Imperial", "Sol Nascente", "Vitória", "Aliança", "Prime", "Mineira", "do Vale", "Serra Azul", "Ipê Amarelo",
  "Família", "Bela Vista", "Horizonte", "Jardim", "Pioneira", "Ouro Fino", "Recanto", "Universal", "Tropical",
];
const SURNAMES = ["Andrade", "Silveira", "Lage", "Moreira", "Duarte", "Fonseca", "Rezende", "Vasconcelos", "Teixeira", "Amaral", "Coelho", "Barbosa", "Guimarães", "Pimenta", "Drummond"];
const STREETS = [
  "Rua Getúlio Vargas", "Av. Brasil", "Rua Tiradentes", "Rua Santos Dumont", "Av. Afonso Pena", "Rua Quinze de Novembro",
  "Rua Sete de Setembro", "Rua Minas Gerais", "Av. JK", "Rua São Paulo", "Rua Padre Eustáquio", "Rua Dom Pedro II",
  "Av. Amazonas", "Rua Rio Branco", "Rua Floriano Peixoto", "Rua Bias Fortes", "Av. Juscelino Kubitschek",
];
const NEIGHBORHOODS = [
  "Centro", "São José", "Santa Maria", "Boa Vista", "Jardim América", "Vila Nova", "Industrial", "Santo Antônio",
  "Cidade Nova", "Bela Vista", "Planalto", "Nossa Senhora de Fátima", "Esplanada", "Vila Rica",
];

const CITY_DDD: Record<string, string> = {
  "juiz de fora": "32", barbacena: "32", "sao joao del rei": "32",
  "governador valadares": "33", "teofilo otoni": "33",
  uberlandia: "34", uberaba: "34", "patos de minas": "34", araguari: "34",
  "pocos de caldas": "35", varginha: "35", "pouso alegre": "35", lavras: "35",
  divinopolis: "37", itauna: "37", "para de minas": "37", formiga: "37",
  "montes claros": "38", paracatu: "38", unai: "38",
};

export function dddForCity(city: string): string {
  const key = city.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  return CITY_DDD[key] ?? "31";
}

function slug(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Gera resultados de busca falsos, mas plausíveis. A semente vem de cidade + nicho:
 * refazer a mesma busca devolve as mesmas empresas (como o cache real fará).
 */
export function generateSearchResults(
  params: Pick<SearchParams, "city" | "niche" | "service">,
  opts: { searchId: string; count?: number; createdAt: string; skipNames?: Set<string> },
): Lead[] {
  const rnd = createRandom(`${slug(params.city)}|${params.niche}`);
  const count = opts.count ?? rnd.int(22, 48);
  const ddd = dddForCity(params.city);
  const prefixes = PREFIXES[params.niche];
  const usesSurname = SURNAME_NICHES.includes(params.niche);
  const used = new Set(opts.skipNames ?? []);
  const leads: Lead[] = [];

  for (let i = 0; leads.length < count && i < count * 4; i++) {
    const name = `${rnd.pick(prefixes)} ${usesSurname && rnd.chance(0.7) ? rnd.pick(SURNAMES) : rnd.pick(PLACE_NAMES)}`;
    if (used.has(name)) continue;
    used.add(name);

    const phoneRoll = rnd.next();
    const phone =
      phoneRoll < 0.56
        ? `(${ddd}) 9${rnd.int(8100, 9999)}-${rnd.int(1000, 9999)}`
        : phoneRoll < 0.86
          ? `(${ddd}) ${rnd.int(3011, 3899)}-${rnd.int(1000, 9999)}`
          : null;

    const webRoll = rnd.next();
    const handle = slug(name).slice(0, 22);
    const website = webRoll < 0.38 ? `https://${handle}.com.br` : webRoll < 0.5 ? `https://instagram.com/${handle}` : null;
    const instagram = !website && rnd.chance(0.45) ? handle : null;

    const reviewTier = rnd.next();
    const reviewCount =
      reviewTier < 0.25 ? rnd.int(0, 15) : reviewTier < 0.5 ? rnd.int(16, 49) : reviewTier < 0.85 ? rnd.int(50, 320) : rnd.int(321, 1900);
    const rating = reviewCount === 0 ? null : Math.round((reviewCount < 10 ? 3.6 + rnd.next() * 1.4 : 4.0 + rnd.next() * 0.95) * 10) / 10;

    leads.push({
      id: `${opts.searchId}_${leads.length}`,
      searchId: opts.searchId,
      service: params.service,
      niche: params.niche,
      name,
      address: `${rnd.pick(STREETS)}, ${rnd.int(12, 2400)}`,
      neighborhood: rnd.pick(NEIGHBORHOODS),
      city: params.city,
      state: "MG",
      phone,
      website,
      instagram,
      rating,
      reviewCount,
      hours: rnd.chance(0.85) ? NICHE_HOURS[params.niche] : null,
      status: "novo",
      inCrm: false,
      lastContactAt: null,
      nextFollowUpAt: null,
      notes: [],
      activities: [{ id: `${opts.searchId}_${leads.length}_a0`, type: "busca", text: `Encontrado na busca de ${params.city}`, at: opts.createdAt }],
      createdAt: opts.createdAt,
    });
  }
  return leads;
}
