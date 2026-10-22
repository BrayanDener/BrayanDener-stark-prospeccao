/**
 * Todas as chamadas ao Supabase do app. Componentes usam os hooks de src/data/queries.ts.
 * Cada função lança AppError com mensagem amigável (detalhe técnico só no console).
 */
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { AppError, edgeFunctionError, toAppError } from "@/lib/errors";
import { defaultTemplatesPayload } from "@/lib/messages";
import type { Activity, DashboardSummary, Lead, LeadStatus, MessageTemplate, NicheKey, Search, SearchParams, ServiceKey, Settings, UndoToken } from "@/types";
import { toActivity, toLead, toSearch, toSettings, toSummary, toTemplate } from "./mappers";

async function run<T>(context: string, fn: () => PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  let res: { data: T; error: unknown };
  try {
    res = await fn();
  } catch (err) {
    throw toAppError(err, context);
  }
  if (res.error) throw toAppError(res.error, context);
  return res.data;
}

function toUndo(leadId: string, j: Json): UndoToken {
  const o = (j ?? {}) as { previous?: Record<string, unknown>; activity_ids?: string[]; changed?: boolean };
  return { leadId, previous: o.previous ?? {}, activityIds: o.activity_ids ?? [], changed: o.changed !== false };
}

// ───────────────────────── Configuração inicial ─────────────────────────

export async function ensureUserSetup(): Promise<void> {
  await run("ensure_user_setup", () => supabase.rpc("ensure_user_setup", { p_templates: defaultTemplatesPayload() as unknown as Json }));
}

// ───────────────────────── Busca (Edge Function) ─────────────────────────

export interface SearchResponse {
  searchId: string;
  fromCache: boolean;
  cachedAt: string | null;
  lat: number;
  lng: number;
  radiusUsed: number;
  totalFound: number;
  googleRequests: number;
  leads: Lead[];
}

export async function runSearch(params: SearchParams & { forceRefresh?: boolean }): Promise<SearchResponse> {
  let data: unknown;
  try {
    const res = await supabase.functions.invoke("search-leads", {
      body: { service: params.service, city: params.city, niche: params.niche, showAll: params.showAll, forceRefresh: !!params.forceRefresh },
    });
    if (res.error) throw await edgeFunctionError(res.error, "search-leads");
    data = res.data;
  } catch (err) {
    throw err instanceof AppError ? err : await edgeFunctionError(err, "search-leads");
  }
  const d = data as Omit<SearchResponse, "leads"> & { leads: Parameters<typeof toLead>[0][] };
  if (!d?.searchId) throw new AppError("INTERNAL", "A busca não retornou resultados válidos.");
  return { ...d, leads: (d.leads ?? []).map(toLead) };
}

// ───────────────────────── Buscas ─────────────────────────

export async function fetchSearch(id: string): Promise<Search | null> {
  const row = await run("searches.get", () => supabase.from("searches").select("*").eq("id", id).maybeSingle());
  return row ? toSearch(row) : null;
}

export async function fetchSearches(opts: { limit: number; offset?: number }): Promise<Search[]> {
  const from = opts.offset ?? 0;
  const rows = await run("searches.list", () =>
    supabase.from("searches").select("*").order("created_at", { ascending: false }).range(from, from + opts.limit - 1),
  );
  return rows.map(toSearch);
}

// ───────────────────────── Leads ─────────────────────────

export async function fetchSearchLeads(searchId: string): Promise<Lead[]> {
  const rows = await run("get_search_leads", () => supabase.rpc("get_search_leads", { p_search_id: searchId }));
  return rows.map(toLead);
}

/** Todos os leads (até 1000, mais recentes primeiro). */
export async function fetchAllLeads(): Promise<Lead[]> {
  const rows = await run("v_leads.all", () => supabase.from("v_leads").select("*").order("first_seen_at", { ascending: false }).limit(1000));
  return rows.map(toLead);
}

export async function fetchLead(id: string): Promise<Lead | null> {
  const row = await run("v_leads.get", () => supabase.from("v_leads").select("*").eq("id", id).maybeSingle());
  return row ? toLead(row) : null;
}

export interface CrmQuery {
  status: LeadStatus | "todos";
  city: string | "todas";
  niche: NicheKey | "todos";
  overdueOnly: boolean;
  query: string;
}

export const CRM_PAGE_SIZE = 50;

/** Lista do CRM com filtros no banco, 50 por página. */
export async function fetchCrmPage(q: CrmQuery, page: number, todayStartIso: string): Promise<Lead[]> {
  const from = page * CRM_PAGE_SIZE;
  const rows = await run("v_leads.crm", () => {
    let req = supabase.from("v_leads").select("*");
    if (q.status !== "todos") req = req.eq("status", q.status);
    if (q.city !== "todas") req = req.eq("city", q.city);
    if (q.niche !== "todos") req = req.eq("niche", q.niche);
    if (q.overdueOnly) req = req.lt("follow_up_at", todayStartIso);
    const term = q.query.trim().replace(/[%_,()]/g, " ");
    if (term) req = req.ilike("name", `%${term}%`);
    return req
      .order("status_updated_at", { ascending: false, nullsFirst: false })
      .order("first_seen_at", { ascending: false })
      .range(from, from + CRM_PAGE_SIZE - 1);
  });
  return rows.map(toLead);
}

/** Kanban: todos fora de "novo" + os N "novos" mais recentes (a coluna Novo pagina). */
export async function fetchKanban(newLimit: number): Promise<Lead[]> {
  const [active, fresh] = await Promise.all([
    run("kanban.ativos", () => supabase.from("v_leads").select("*").neq("status", "novo").order("status_updated_at", { ascending: false }).limit(1000)),
    run("kanban.novos", () => supabase.from("v_leads").select("*").eq("status", "novo").order("first_seen_at", { ascending: false }).limit(newLimit)),
  ]);
  return [...active, ...fresh].map(toLead);
}

export async function fetchDueFollowups(limit = 50): Promise<Lead[]> {
  const rows = await run("due_followups", () => supabase.rpc("due_followups", { p_limit: limit }));
  return rows.map(toLead);
}

// ───────────────────────── CRM (ações com "Desfazer") ─────────────────────────

export async function setLeadStatus(leadId: string, status: LeadStatus): Promise<UndoToken> {
  return toUndo(leadId, await run("set_lead_status", () => supabase.rpc("set_lead_status", { p_lead_id: leadId, p_status: status })));
}

export async function registerContact(leadId: string, channel: "whatsapp" | "ligacao", message?: string): Promise<UndoToken> {
  return toUndo(leadId, await run("register_contact", () => supabase.rpc("register_contact", { p_lead_id: leadId, p_channel: channel, p_message: message })));
}

export async function setFollowUp(leadId: string, at: string | null): Promise<UndoToken> {
  return toUndo(leadId, await run("set_follow_up", () => supabase.rpc("set_follow_up", { p_lead_id: leadId, p_at: at })));
}

export async function completeFollowUp(leadId: string): Promise<UndoToken> {
  return toUndo(leadId, await run("complete_follow_up", () => supabase.rpc("complete_follow_up", { p_lead_id: leadId })));
}

/** Desfaz: restaura status/datas e apaga as atividades criadas pela ação. */
export async function undo(token: UndoToken): Promise<void> {
  await run("restore_lead_state", () => supabase.rpc("restore_lead_state", { p_lead_id: token.leadId, p_previous: token.previous as Json }));
  if (token.activityIds.length > 0) {
    await run("lead_activities.undo", () => supabase.from("lead_activities").delete().in("id", token.activityIds));
  }
}

export async function updateNotes(leadId: string, notes: string): Promise<void> {
  await run("lead_status.notes", () => supabase.from("lead_status").update({ notes }).eq("lead_id", leadId));
}

export async function fetchActivities(leadId: string): Promise<Activity[]> {
  const rows = await run("lead_activities.list", () =>
    supabase.from("lead_activities").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(100),
  );
  return rows.map(toActivity);
}

// ───────────────────────── Dashboard ─────────────────────────

export async function fetchDashboard(): Promise<DashboardSummary> {
  return toSummary(await run("dashboard_summary", () => supabase.rpc("dashboard_summary")));
}

// ───────────────────────── Configurações ─────────────────────────

export async function fetchSettings(): Promise<Settings> {
  const row = await run("user_settings.get", () => supabase.from("user_settings").select("*").maybeSingle());
  return toSettings(row);
}

export async function saveSettings(s: Settings): Promise<Settings> {
  const row = await run("user_settings.save", () =>
    supabase
      .from("user_settings")
      .upsert(
        {
          cache_days: s.cacheDays,
          min_reviews_busy: s.minReviewsBusy,
          followup_days: s.followUpDays,
          hide_contacted: s.hideContacted,
          signature: s.signature,
        },
        { onConflict: "user_id" },
      )
      .select("*")
      .single(),
  );
  return toSettings(row);
}

// ───────────────────────── Modelos ─────────────────────────

export async function fetchTemplates(): Promise<MessageTemplate[]> {
  const rows = await run("message_templates.list", () => supabase.from("message_templates").select("*").order("service").order("niche", { nullsFirst: true }));
  return rows.map(toTemplate);
}

export async function saveTemplate(t: { id?: string; service: ServiceKey; niche: NicheKey | null; title: string; body: string; isDefault?: boolean }): Promise<MessageTemplate> {
  const payload = { service: t.service, niche: t.niche, title: t.title, body: t.body, is_default: t.isDefault ?? false };
  try {
    const row = await run("message_templates.save", () =>
      t.id
        ? supabase.from("message_templates").update(payload).eq("id", t.id).select("*").single()
        : supabase.from("message_templates").insert(payload).select("*").single(),
    );
    return toTemplate(row);
  } catch (err) {
    if (err instanceof AppError && err.code === "DUPLICATE") {
      throw new AppError("DUPLICATE", "Já existe um modelo para esse serviço e nicho. Edite o existente.", err);
    }
    throw err;
  }
}

export async function deleteTemplate(id: string): Promise<void> {
  await run("message_templates.delete", () => supabase.from("message_templates").delete().eq("id", id));
}

// ───────────────────────── IA (Etapa 4) ─────────────────────────

export async function generateMessage(leadId: string, service: ServiceKey, tone: "direto" | "amigavel"): Promise<string> {
  try {
    const res = await supabase.functions.invoke("generate-message", { body: { leadId, service, tone } });
    if (res.error) throw await edgeFunctionError(res.error, "generate-message");
    const text = (res.data as { message?: string } | null)?.message?.trim();
    if (!text) throw new AppError("AI_UNAVAILABLE", "A IA não devolveu uma mensagem. Tente de novo.");
    return text;
  } catch (err) {
    throw err instanceof AppError ? err : await edgeFunctionError(err, "generate-message");
  }
}
