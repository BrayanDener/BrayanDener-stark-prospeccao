import type { Search } from "@/types";
import { daysAgo } from "./time";

/** Buscas já feitas. totalFound = quantos resultados o "Google" devolveu. */
export const MOCK_SEARCHES: (Search & { totalFound: number })[] = [
  { id: "busca_itabira_barbearias", service: "sites", city: "Itabira", niche: "barbearias", ignoreFilter: false, createdAt: daysAgo(1, 19, 40), totalFound: 24 },
  { id: "busca_bh_restaurantes", service: "automacoes", city: "Belo Horizonte", niche: "restaurantes", ignoreFilter: false, createdAt: daysAgo(3, 14, 5), totalFound: 46 },
  { id: "busca_ipatinga_saloes", service: "marketing", city: "Ipatinga", niche: "saloes", ignoreFilter: false, createdAt: daysAgo(5, 10, 12), totalFound: 31 },
  { id: "busca_monlevade_dentistas", service: "apps", city: "João Monlevade", niche: "dentistas", ignoreFilter: false, createdAt: daysAgo(8, 16, 30), totalFound: 22 },
  { id: "busca_contagem_oficinas", service: "sites", city: "Contagem", niche: "oficinas", ignoreFilter: false, createdAt: daysAgo(12, 9, 15), totalFound: 38 },
  { id: "busca_setelagoas_estetica", service: "marketing", city: "Sete Lagoas", niche: "estetica_automotiva", ignoreFilter: false, createdAt: daysAgo(16, 11, 0), totalFound: 19 },
  { id: "busca_divinopolis_padarias", service: "design", city: "Divinópolis", niche: "padarias", ignoreFilter: false, createdAt: daysAgo(21, 15, 45), totalFound: 27 },
];
