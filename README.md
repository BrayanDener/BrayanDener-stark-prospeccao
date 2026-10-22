# Stark Prospecção

Painel pessoal de prospecção B2B da Stark IA: encontra pequenos negócios no Google que precisam de site, marketing, automação ou app, pontua cada um e organiza a abordagem pelo WhatsApp num mini-CRM. PWA, feito para o celular.

**Stack:** React 18 + TypeScript + Vite 5 + Tailwind 3 + shadcn/ui + React Query · Supabase (Auth, Postgres com RLS, Edge Functions em Deno) · Google Places API (New) + Geocoding · Claude (mensagens com IA).

## Configuração (uma vez só)

Projeto Supabase: **stark-prospeccao** (`fikbetwjamzkphgnoxol`, região São Paulo). Banco e funções já estão criados e publicados.

1. **Usuário**: Authentication → Users → *Add user* → seu e-mail + senha, marcando *Auto Confirm User*.
2. **Cadastro fechado**: Authentication → Sign In / Providers → desligar *Allow new users to sign up*.
3. **Secrets** (Edge Functions → Secrets):
   - `GOOGLE_MAPS_API_KEY`: chave do Google Cloud.
   - `ALLOWED_EMAIL`: o mesmo e-mail do passo 1. Sem ele, as funções recusam todo mundo.
   - `AI_API_KEY`: chave da API da Anthropic (console.anthropic.com), só para o "Gerar com IA".
4. **Google Cloud**: ativar **Places API (New)** e **Geocoding API**; restringir a chave a essas duas APIs; criar um alerta de orçamento (Faturamento → Orçamentos e alertas).
5. **Limpeza**: apagar os usuários de teste `teste-a/b/c@stark-teste.local` (Authentication → Users).

## Rodar

```bash
npm install
npm run dev        # http://localhost:8080
npm test           # 41 testes das regras de negócio
npm run build      # checa tipos e gera dist/ (PWA)
```

O app já aponta para o projeto (URL + chave publicável). Para outro projeto, use `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (veja `.env.example`). Nenhuma chave secreta fica no front.

## Como funciona

- **Busca** (`supabase/functions/search-leads`): valida a entrada e o e-mail permitido. Busca no cache (mesma cidade + nicho dentro de `cache_days`): se achar, devolve os leads salvos sem chamar o Google. Senão: geocoding (com cache) → Text Search por palavra-chave do nicho, até 3 páginas, raio 8 → 20 → 40 km até achar 15 empresas → remove duplicados, fechados e longe demais → classifica site e telefone → grava tudo numa transação. Usa o JWT do usuário: o RLS vale também na função.
- **Filtro e score** no front (`src/lib/filters.ts`, `src/lib/score.ts`, pesos em constantes), com a regra por serviço compartilhada em `supabase/functions/_shared/qualify.ts`.
- **CRM** (`supabase/migrations/*_etapa3_crm.sql`): funções `set_lead_status`, `register_contact`, `set_follow_up`, `complete_follow_up`, `restore_lead_state` (Desfazer) e `dashboard_summary` / `due_followups` (contagens no banco, fuso America/Sao_Paulo).
- **IA** (`supabase/functions/generate-message`): lê o lead no banco e gera até 350 caracteres com o Claude (`claude-opus-5-5`, esforço baixo, reserva automática em caso de recusa). Só usa os dados do lead.
- **PWA**: `vite-plugin-pwa`; cache só dos arquivos do app; Supabase sempre pela rede; aviso "Nova versão disponível · Atualizar".

## Estrutura

```
src/
  config/        services, status, niches (reexporta supabase/functions/_shared/niches.ts), nav
  data/          api.ts (todas as chamadas ao Supabase) · queries.ts (React Query, otimista + Desfazer) · mappers.ts
  integrations/  supabase/client.ts · supabase/types.ts (tipos gerados do banco)
  lib/           score · filters · phone · messages · hours · links · errors · export-xlsx (+ testes)
  store/         auth (Supabase Auth) · ui-store (wizard e painéis)
  components/    ui (shadcn) · stark (design system) · layout · wizard · leads (card, detalhe, mapa) · whatsapp · crm · searches
  pages/         Login, Dashboard, Leads, Crm, Historico, Modelos, Configuracoes
supabase/
  migrations/    esquema, RLS, views e funções (aplicadas no projeto)
  functions/     search-leads · generate-message · _shared (nichos, serviços, telefone, site, filtro, http)
```

## Segurança

- RLS em todas as tabelas (`user_id = auth.uid()`), inclusive conferindo que lead e busca referenciados também são do usuário. O papel `anon` não lê nada.
- Edge Functions: JWT obrigatório + `ALLOWED_EMAIL` (fecha por padrão).
- Chaves do Google e da IA só em secrets do Supabase. `grep -r AIza dist` não encontra nada.
