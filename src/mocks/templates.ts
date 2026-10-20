import type { MessageTemplate } from "@/types";
import { daysAgo } from "./time";

export const MOCK_TEMPLATES: MessageTemplate[] = [
  {
    id: "tpl_sites_1",
    service: "sites",
    name: "Sites — primeiro contato",
    body:
      "Olá! Tudo bem? Encontrei a {{empresa}} no Google aqui de {{cidade}} e vi que vocês têm nota {{nota}} com {{avaliacoes}} avaliações. Parabéns pelo trabalho!\n\nReparei que vocês ainda não têm um site. Hoje muita gente pesquisa no Google antes de escolher onde ir, e um site simples, com WhatsApp, fotos e localização, costuma trazer cliente novo toda semana.\n\nPosso te mandar um exemplo de como ficaria, sem compromisso?\n\n{{assinatura}}",
    updatedAt: daysAgo(6),
  },
  {
    id: "tpl_sites_2",
    service: "sites",
    name: "Sites — quem só tem Instagram",
    body:
      "Oi! Vi o Instagram da {{empresa}}, ficou muito bom. Uma dúvida: quando alguém procura {{nicho}} em {{cidade}} no Google, vocês aparecem com um site próprio?\n\nTenho ajudado negócios daqui a transformar o perfil em um site rápido, com agendamento pelo WhatsApp. Quer que eu te mostre como ficaria?\n\n{{assinatura}}",
    updatedAt: daysAgo(10),
  },
  {
    id: "tpl_marketing_1",
    service: "marketing",
    name: "Marketing — reputação e alcance",
    body:
      "Olá! Achei a {{empresa}} no Google Maps. Vocês têm {{avaliacoes}} avaliações, e dá para crescer bastante com algumas ações simples: perfil do Google otimizado, posts constantes e anúncios só para quem está perto.\n\nPosso te enviar um diagnóstico rápido e gratuito do perfil de vocês?\n\n{{assinatura}}",
    updatedAt: daysAgo(4),
  },
  {
    id: "tpl_automacoes_1",
    service: "automacoes",
    name: "Automações — atendimento no WhatsApp",
    body:
      "Olá, tudo bem? Vi que a {{empresa}} tem um movimento excelente: {{avaliacoes}} avaliações no Google!\n\nCom esse volume, imagino que o WhatsApp não para. Criamos assistentes com IA que respondem dúvidas, mandam cardápio e horários e fazem reservas 24h, sem perder o jeito da casa.\n\nFaz sentido conversarmos 10 minutos esta semana?\n\n{{assinatura}}",
    updatedAt: daysAgo(2),
  },
  {
    id: "tpl_apps_1",
    service: "apps",
    name: "Apps — agenda e gestão",
    body:
      "Olá! A {{empresa}} tem ótimas avaliações em {{cidade}} ({{nota}} de nota). Vocês ainda marcam os horários pelo WhatsApp ou na agenda de papel?\n\nDesenvolvemos sistemas de agendamento online com lembrete automático, que reduzem bastante as faltas. Posso te mostrar uma demonstração rápida?\n\n{{assinatura}}",
    updatedAt: daysAgo(9),
  },
  {
    id: "tpl_design_1",
    service: "design",
    name: "Design — identidade visual",
    body:
      "Olá! Conheci a {{empresa}} pelo Google e gostei muito do que vocês fazem. Trabalho com identidade visual e materiais para negócios de {{cidade}}: logo, cardápio, fachada e posts.\n\nPosso te mandar alguns trabalhos recentes?\n\n{{assinatura}}",
    updatedAt: daysAgo(15),
  },
  {
    id: "tpl_outro_1",
    service: "outro",
    name: "Genérico — apresentação curta",
    body:
      "Olá! Tudo bem? Encontrei a {{empresa}} no Google e queria me apresentar rapidinho: ajudo negócios de {{cidade}} a vender mais com tecnologia e IA.\n\nPosso te contar em 2 minutos como funciona?\n\n{{assinatura}}",
    updatedAt: daysAgo(20),
  },
];
