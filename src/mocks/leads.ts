import type { Activity, Lead, LeadStatus, NicheKey, Note, ServiceKey, WeeklyHours } from "@/types";
import { HOURS } from "./hours";
import { daysAgo, daysFromNow } from "./time";

interface Seed {
  id: string;
  name: string;
  address: string;
  neighborhood: string;
  phone?: string | null;
  website?: string | null;
  instagram?: string | null;
  rating: number | null;
  reviewCount: number;
  hours?: WeeklyHours | null;
  status?: LeadStatus;
  inCrm?: boolean;
  lastContact?: number; // dias atrás
  followUp?: number; // dias a partir de hoje (negativo = atrasado)
  notes?: string[];
}

interface SearchRef {
  searchId: string;
  service: ServiceKey;
  city: string;
  niche: NicheKey;
  createdDaysAgo: number;
}

const STATUS_TEXT: Record<LeadStatus, string> = {
  novo: "Novo",
  contatado: "Contatado",
  respondeu: "Respondeu",
  negociando: "Negociando",
  fechado: "Fechado",
  sem_interesse: "Sem interesse",
};

function build(ref: SearchRef, s: Seed): Lead {
  const status = s.status ?? "novo";
  const created = daysAgo(ref.createdDaysAgo, 11);
  const activities: Activity[] = [{ id: `${s.id}_a0`, type: "busca", text: `Encontrado na busca de ${ref.city}`, at: created }];
  const notes: Note[] = (s.notes ?? []).map((text, i) => ({
    id: `${s.id}_n${i}`,
    text,
    at: daysAgo(Math.max(0, (s.lastContact ?? 1) - 1), 18, 10 + i),
  }));

  if (s.lastContact !== undefined) {
    activities.push({ id: `${s.id}_a1`, type: "whatsapp", text: "Mensagem enviada pelo WhatsApp", at: daysAgo(s.lastContact, 10, 30) });
    if (status !== "contatado" && status !== "novo") {
      activities.push({
        id: `${s.id}_a2`,
        type: "status",
        text: `Status alterado para ${STATUS_TEXT[status]}`,
        at: daysAgo(Math.max(0, s.lastContact - 1), 15, 20),
      });
    }
  }
  for (const n of notes) activities.push({ id: `${n.id}_act`, type: "nota", text: "Anotação adicionada", at: n.at });
  if (s.followUp !== undefined) {
    activities.push({ id: `${s.id}_a3`, type: "followup", text: "Follow-up agendado", at: daysAgo(Math.max(0, s.lastContact ?? 0), 10, 35) });
  }
  activities.sort((a, b) => b.at.localeCompare(a.at));

  return {
    id: s.id,
    searchId: ref.searchId,
    service: ref.service,
    niche: ref.niche,
    name: s.name,
    address: s.address,
    neighborhood: s.neighborhood,
    city: ref.city,
    state: "MG",
    phone: s.phone ?? null,
    website: s.website ?? null,
    instagram: s.instagram ?? null,
    rating: s.rating,
    reviewCount: s.reviewCount,
    hours: s.hours === undefined ? null : s.hours,
    status,
    inCrm: s.inCrm ?? true,
    lastContactAt: s.lastContact !== undefined ? daysAgo(s.lastContact, 10, 30) : null,
    nextFollowUpAt: s.followUp !== undefined ? daysFromNow(s.followUp) : null,
    notes,
    activities,
    createdAt: created,
  };
}

const itabira: SearchRef = { searchId: "busca_itabira_barbearias", service: "sites", city: "Itabira", niche: "barbearias", createdDaysAgo: 1 };
const bh: SearchRef = { searchId: "busca_bh_restaurantes", service: "automacoes", city: "Belo Horizonte", niche: "restaurantes", createdDaysAgo: 3 };
const ipatinga: SearchRef = { searchId: "busca_ipatinga_saloes", service: "marketing", city: "Ipatinga", niche: "saloes", createdDaysAgo: 5 };
const monlevade: SearchRef = { searchId: "busca_monlevade_dentistas", service: "apps", city: "João Monlevade", niche: "dentistas", createdDaysAgo: 8 };
const contagem: SearchRef = { searchId: "busca_contagem_oficinas", service: "sites", city: "Contagem", niche: "oficinas", createdDaysAgo: 12 };
const seteLagoas: SearchRef = { searchId: "busca_setelagoas_estetica", service: "marketing", city: "Sete Lagoas", niche: "estetica_automotiva", createdDaysAgo: 16 };
const divinopolis: SearchRef = { searchId: "busca_divinopolis_padarias", service: "design", city: "Divinópolis", niche: "padarias", createdDaysAgo: 21 };

/** 33 leads escritos à mão: cobrem todos os status, tipos de telefone e presença online. */
export const MOCK_LEADS: Lead[] = [
  // Itabira · barbearias · Criação de Sites
  build(itabira, { id: "lead_dom_bigode", name: "Barbearia Dom Bigode", address: "Rua Água Santa, 112", neighborhood: "Centro", phone: "(31) 98812-4471", instagram: "dombigode.ita", rating: 4.8, reviewCount: 132, hours: HOURS.barbearia, status: "contatado", lastContact: 3, followUp: 0, notes: ["Dono é o Rafael. Prefere conversar depois das 19h."] }),
  build(itabira, { id: "lead_gringo", name: "Barbearia do Gringo", address: "Av. João Pinheiro, 450", neighborhood: "Pará", phone: "(31) 3831-2290", rating: 4.5, reviewCount: 41, hours: HOURS.barbearia }),
  build(itabira, { id: "lead_navalha_ouro", name: "Navalha de Ouro Barber Shop", address: "Rua Tiradentes, 89", neighborhood: "Penha", phone: "31997013388", website: "https://instagram.com/navalhadeouro", rating: 4.9, reviewCount: 210, hours: HOURS.barbearia, status: "respondeu", lastContact: 4, followUp: -1, notes: ["Pediu exemplos de sites de barbearia. Mandar o portfólio."] }),
  build(itabira, { id: "lead_studio33", name: "Studio 33 Barbearia", address: "Rua Santana, 33", neighborhood: "Centro", phone: "(31) 98455-0921", website: "https://studio33barbearia.com.br", rating: 4.7, reviewCount: 98, hours: HOURS.barbearia, inCrm: false }),
  build(itabira, { id: "lead_vila_rica", name: "Barbearia Vila Rica", address: "Rua Dr. Guerra, 210", neighborhood: "Vila Santa Rosa", rating: 4.2, reviewCount: 9, hours: null, inCrm: false }),
  build(itabira, { id: "lead_corte_fino", name: "Corte Fino Barbearia", address: "Av. Carlos de Paula Andrade, 1020", neighborhood: "Bela Vista", phone: "(31) 99133-7612", instagram: "cortefino.itabira", rating: 4.6, reviewCount: 64, hours: HOURS.barbearia, status: "fechado", lastContact: 10, notes: ["Fechou site + Google Meu Negócio. R$ 1.800, entrada paga."] }),

  // Belo Horizonte · restaurantes · Automações
  build(bh, { id: "lead_fogao_serra", name: "Restaurante Fogão Mineiro da Serra", address: "Rua do Ouro, 1210", neighborhood: "Serra", phone: "(31) 3221-4580", website: "https://fogaomineirodaserra.com.br", rating: 4.6, reviewCount: 1284, hours: HOURS.restaurante, status: "negociando", lastContact: 3, followUp: 1, notes: ["Quer assistente no WhatsApp para reservas e cardápio.", "Enviar proposta até sexta. Decisor: Sr. Paulo."] }),
  build(bh, { id: "lead_bella_savassi", name: "Pizzaria Bella Savassi", address: "Rua Pernambuco, 880", neighborhood: "Savassi", phone: "(31) 99876-1020", website: "https://bellasavassi.com.br", rating: 4.4, reviewCount: 2047, hours: HOURS.lanchonete, status: "contatado", lastContact: 3, followUp: 0 }),
  build(bh, { id: "lead_brasa_pao", name: "Hamburgueria Brasa & Pão", address: "Av. Getúlio Vargas, 1500", neighborhood: "Funcionários", phone: "(31) 98221-0090", website: "https://www.instagram.com/brasaepao", rating: 4.7, reviewCount: 856, hours: HOURS.lanchonete, status: "respondeu", lastContact: 1, followUp: 2 }),
  build(bh, { id: "lead_ponto_certo", name: "Lanchonete Ponto Certo", address: "Rua dos Caetés, 320", neighborhood: "Centro", phone: "(31) 3274-1199", rating: 4.1, reviewCount: 312, hours: HOURS.lanchonete, status: "sem_interesse", lastContact: 9, notes: ["Disse que já tem atendente. Tentar de novo em 6 meses."] }),
  build(bh, { id: "lead_sabor_casa", name: "Restaurante Sabor de Casa", address: "Rua Itajubá, 455", neighborhood: "Floresta", phone: "(31) 99654-2210", rating: 4.3, reviewCount: 38, hours: HOURS.restaurante, inCrm: false }),
  build(bh, { id: "lead_nonna_lia", name: "Cantina Nonna Lia", address: "Rua Alagoas, 1090", neighborhood: "Funcionários", phone: "(31) 98744-3302", website: "https://cantinanonnalia.com.br", rating: 4.8, reviewCount: 689, hours: HOURS.restaurante }),

  // Ipatinga · salões · Marketing
  build(ipatinga, { id: "lead_bella_mulher", name: "Studio Bella Mulher", address: "Av. 28 de Abril, 640", neighborhood: "Centro", phone: "(31) 98822-1567", instagram: "studiobellamulher", rating: 4.9, reviewCount: 27, hours: HOURS.salao, status: "contatado", lastContact: 5, followUp: -2 }),
  build(ipatinga, { id: "lead_glamour", name: "Espaço Glamour Cabeleireiros", address: "Rua Diamantina, 85", neighborhood: "Cidade Nobre", phone: "(31) 3822-4410", rating: 4.3, reviewCount: 18, hours: HOURS.salao }),
  build(ipatinga, { id: "lead_unhas_seda", name: "Esmalteria Unhas de Seda", address: "Rua Pedra Azul, 210", neighborhood: "Bom Retiro", phone: "(31) 99102-7781", website: "https://unhasdeseda.com.br", rating: 4.8, reviewCount: 156, hours: HOURS.salao, inCrm: false }),
  build(ipatinga, { id: "lead_cachos", name: "Salão Cachos & Cia", address: "Av. Selim José de Sales, 1300", neighborhood: "Canaã", phone: "(31) 98603-4432", instagram: "cachosecia.ipatinga", rating: 4.6, reviewCount: 44, hours: HOURS.salao, status: "negociando", lastContact: 2, followUp: 0, notes: ["Interessada em tráfego pago + posts. Orçamento: R$ 900/mês."] }),
  build(ipatinga, { id: "lead_beleza_pura", name: "Beleza Pura Manicure", address: "Rua Ouro Preto, 77", neighborhood: "Iguaçu", rating: 3.9, reviewCount: 7, hours: null }),

  // João Monlevade · dentistas · Aplicativos
  build(monlevade, { id: "lead_odonto_sorriso", name: "Odonto Sorriso Monlevade", address: "Av. Wilson Alvarenga, 1180", neighborhood: "Carneirinhos", phone: "(31) 3851-2020", website: "https://odontosorrisomonlevade.com.br", rating: 4.7, reviewCount: 243, hours: HOURS.clinica, status: "respondeu", lastContact: 2, followUp: 0, notes: ["Recepcionista pediu para falar com a Dra. Lúcia na terça."] }),
  build(monlevade, { id: "lead_odonto_vida", name: "Clínica Odontológica Vida", address: "Rua Sete de Setembro, 45", neighborhood: "Centro", phone: "(31) 98877-6611", rating: 4.9, reviewCount: 88, hours: HOURS.clinica, status: "contatado", lastContact: 0, followUp: 3 }),
  build(monlevade, { id: "lead_ortoprime", name: "OrtoPrime Ortodontia", address: "Av. Getúlio Vargas, 3050", neighborhood: "Baú", phone: "(31) 99234-1188", website: "https://ortoprime.com.br", rating: 4.6, reviewCount: 71, hours: HOURS.clinica, status: "fechado", lastContact: 14, notes: ["Sistema de agendamento online. Implantação começa em novembro."] }),
  build(monlevade, { id: "lead_marcos_lage", name: "Dr. Marcos Lage Dentista", address: "Rua Duque de Caxias, 300", neighborhood: "Centro", phone: "(31) 3852-7744", rating: 5.0, reviewCount: 12, hours: HOURS.escritorio, inCrm: false }),
  build(monlevade, { id: "lead_sorrisos", name: "Sorrisos Odontologia Integrada", address: "Rua Pedro Lessa, 120", neighborhood: "República", phone: "(31) 98540-9921", website: "https://linktr.ee/sorrisosodonto", rating: 4.8, reviewCount: 164, hours: HOURS.clinica }),

  // Contagem · oficinas · Criação de Sites
  build(contagem, { id: "lead_eldorado", name: "Auto Center Eldorado", address: "Av. João César de Oliveira, 2240", neighborhood: "Eldorado", phone: "(31) 3391-5522", rating: 4.5, reviewCount: 322, hours: HOURS.oficina, status: "contatado", lastContact: 6, followUp: -3 }),
  build(contagem, { id: "lead_irmaos_souza", name: "Funilaria e Pintura Irmãos Souza", address: "Rua Rio Comprido, 410", neighborhood: "Novo Riacho", phone: "(31) 98701-2244", rating: 4.8, reviewCount: 59, hours: HOURS.oficina, status: "respondeu", lastContact: 1, followUp: 0 }),
  build(contagem, { id: "lead_rota040", name: "Mecânica Rota 040", address: "Rod. BR-040, km 520", neighborhood: "Nacional", phone: "(31) 99611-4022", website: "https://mecanicarota040.com.br", rating: 4.4, reviewCount: 140, hours: HOURS.oficina, inCrm: false }),
  build(contagem, { id: "lead_faisca", name: "AutoElétrica Faísca", address: "Rua Sabará, 98", neighborhood: "Industrial", phone: "(31) 98414-6630", instagram: "autoeletricafaisca", rating: 4.6, reviewCount: 37, hours: HOURS.oficina }),
  build(contagem, { id: "lead_tonhao", name: "Oficina do Tonhão", address: "Rua Itaúna, 1500", neighborhood: "Riacho", phone: "(31) 3352-1180", rating: 4.0, reviewCount: 23, hours: HOURS.oficina, status: "sem_interesse", lastContact: 8 }),

  // Sete Lagoas · estética automotiva · Marketing
  build(seteLagoas, { id: "lead_agua_limpa", name: "Lava Jato Água Limpa", address: "Av. Prefeito Alberto Moura, 2800", neighborhood: "Distrito Industrial", phone: "(31) 99744-2015", rating: 4.4, reviewCount: 26, hours: HOURS.comercial, status: "negociando", lastContact: 1, followUp: 2 }),
  build(seteLagoas, { id: "lead_premium_car", name: "Estética Automotiva Premium Car", address: "Rua Monsenhor Messias, 512", neighborhood: "Centro", phone: "(31) 98805-3341", website: "https://premiumcarsl.com.br", rating: 4.9, reviewCount: 112, hours: HOURS.comercial, inCrm: false }),
  build(seteLagoas, { id: "lead_martelinho", name: "Martelinho de Ouro Sete Lagoas", address: "Rua Professor Ivo, 66", neighborhood: "Canaan", phone: "(31) 3771-8890", rating: 4.7, reviewCount: 19, hours: HOURS.comercial, status: "fechado", lastContact: 20, notes: ["Fechou landing page + Google Ads. Indicou outro lava jato."] }),

  // Divinópolis · padarias · Design
  build(divinopolis, { id: "lead_pao_nosso", name: "Padaria Pão Nosso", address: "Rua Goiás, 1020", neighborhood: "Centro", phone: "(37) 3221-4455", website: "https://padariapaonosso.com.br", rating: 4.5, reviewCount: 412, hours: HOURS.padaria, status: "contatado", lastContact: 4, followUp: -1 }),
  build(divinopolis, { id: "lead_doce_encanto", name: "Confeitaria Doce Encanto", address: "Av. Primeiro de Junho, 300", neighborhood: "Centro", phone: "(37) 99812-6677", instagram: "doceencanto.div", rating: 4.9, reviewCount: 203, hours: HOURS.padaria, status: "respondeu", lastContact: 2, followUp: 1 }),
  build(divinopolis, { id: "lead_santa_clara", name: "Padaria Santa Clara", address: "Rua Rio de Janeiro, 870", neighborhood: "Porto Velho", phone: "(37) 98411-0023", rating: 4.2, reviewCount: 95, hours: HOURS.padaria }),
];
