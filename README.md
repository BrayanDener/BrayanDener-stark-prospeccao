# Stark Prospecção

Painel pessoal de prospecção B2B da Stark IA: encontra pequenos negócios que precisam de site, marketing, automação ou app e organiza a abordagem pelo WhatsApp.

**Stack:** React 18 + TypeScript + Vite 5 + Tailwind 3 + shadcn/ui (Radix) + lucide-react + framer-motion + @dnd-kit · Backend (Etapa 2): Supabase.

## Rodar

```bash
npm install
npm run dev        # http://localhost:8080
npm test           # testes das regras de negócio
npm run build      # checa tipos e gera dist/
```

Etapa 1: qualquer e-mail válido + senha de 6+ caracteres entra (login simulado).
Para ver o estado de erro de qualquer tela, adicione `?simular=erro` na URL.

## Etapas

- [x] **1. Layout, design system e telas com dados de exemplo** (esta entrega)
- [ ] 2. Supabase: Auth, tabelas com RLS, CRM persistido
- [ ] 3. Edge Function de busca no Google Places (chave como secret) + cache + mapa
- [ ] 4. IA nas mensagens, PWA completo e notificações

## Estrutura

```
src/
  config/      services.ts · status.ts · niches.ts (reexporta supabase/functions/_shared/niches.ts) · nav.ts
  lib/         score.ts · filters.ts · phone.ts · messages.ts · hours.ts · format.ts · metrics.ts  (+ *.test.ts)
  mocks/       33 leads escritos à mão em MG + gerador determinístico de resultados
  store/       app-store (dados) · ui-store (wizard e painéis) · session (login simulado)
  components/
    ui/        shadcn adaptado aos tokens da Stark
    stark/     ScoreRing, StatusBadge, LeadTag, MetricCard, EmptyState, ErrorState, PageHeader, LightLine, ResponsivePanel…
    layout/    Sidebar (desktop), BottomNav + "Mais" (celular), MobileHeader
    wizard/    SearchWizard (Dialog no desktop, Drawer em tela cheia no celular)
    leads/     LeadCard, LeadActions, LeadDetailPanel
    whatsapp/  WhatsAppPanel
    crm/       KanbanBoard (arrastar no desktop, "Mover" no celular), CrmCard
  pages/       Login, Dashboard, Leads, Crm, Historico, Modelos, Configuracoes
supabase/functions/_shared/niches.ts   fonte única dos nichos (app + Edge Functions)
```

## Regras de negócio (funções puras)

| Arquivo | O que faz |
|---|---|
| `lib/filters.ts` | Filtro por serviço (Sites: sem site próprio; Marketing: sem site **ou** < 30 avaliações; Automações/Apps: ≥ mínimo de avaliações; Design/Outro: tudo), filtros da lista, ordenação, follow-up atrasado |
| `lib/score.ts` | Score 0–100 por serviço; cada serviço tem critérios que somam 100 e alimentam "Por que esse score?" |
| `lib/phone.ts` | Normaliza telefone BR, separa celular/fixo, formata e gera links `wa.me` e `tel:` |
| `lib/messages.ts` | Variáveis `{{empresa}}`, `{{cidade}}`, `{{nicho}}`, `{{nota}}`, `{{avaliacoes}}`, `{{assinatura}}` |

Perfis só de Instagram/Linktree contam como **sem site** (é o lead ideal para Criação de Sites).

## Decisões de design

- **Contraste AA:** `#3B82F6` continua sendo a cor de destaque (anéis, foco, linha de luz, links). Botões preenchidos usam `#2563EB` (texto branco 5,2:1; o `#3B82F6` daria 3,7:1). O cinza terciário `#5E6E87` (3,4:1) é usado só em ícones e decoração, nunca em texto.
- **Botão WhatsApp:** fundo azul suave com o ícone verde. O verde sobre o azul sólido não atinge 3:1.
- **CRM ≠ resultados de busca:** um lead entra no CRM quando você muda o status, anota, agenda follow-up ou toca em "Adicionar ao CRM". Assim o Kanban não fica com centenas de "Novos".
- **Segurança:** nenhuma chave no front-end. A chave do Google será um secret do Supabase lido só pela Edge Function.
