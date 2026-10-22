/**
 * Hooks de dados (React Query). Mutations de CRM são otimistas: a tela muda na hora
 * e volta ao estado anterior se o servidor recusar.
 */
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getStatus } from "@/config/status";
import { errorMessage } from "@/lib/errors";
import type { Lead, LeadStatus, MessageTemplate, Settings, UndoToken } from "@/types";
import * as api from "./api";
import { DEFAULT_SETTINGS } from "./mappers";

export const qk = {
  searches: (limit: number) => ["searches", limit] as const,
  search: (id: string) => ["search", id] as const,
  searchLeads: (id: string) => ["leads", "search", id] as const,
  allLeads: () => ["leads", "all"] as const,
  lead: (id: string) => ["leads", "one", id] as const,
  crm: (q: api.CrmQuery) => ["leads", "crm", q] as const,
  kanban: (newLimit: number) => ["leads", "kanban", newLimit] as const,
  due: () => ["leads", "due"] as const,
  activities: (id: string) => ["activities", id] as const,
  dashboard: () => ["dashboard"] as const,
  settings: () => ["settings"] as const,
  templates: () => ["templates"] as const,
};

// ───────────────────────── Leitura ─────────────────────────

export const useSearches = (limit = 50) => useQuery({ queryKey: qk.searches(limit), queryFn: () => api.fetchSearches({ limit }) });

export const useSearch = (id: string | null | undefined) =>
  useQuery({ queryKey: qk.search(id ?? ""), queryFn: () => api.fetchSearch(id!), enabled: !!id });

export const useSearchLeads = (id: string | null | undefined) =>
  useQuery({ queryKey: qk.searchLeads(id ?? ""), queryFn: () => api.fetchSearchLeads(id!), enabled: !!id });

export const useAllLeads = (enabled = true) => useQuery({ queryKey: qk.allLeads(), queryFn: api.fetchAllLeads, enabled });

/** Busca o lead em qualquer lista já carregada; se não houver, vai ao banco. */
export function useLead(id: string | null | undefined) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: qk.lead(id ?? ""),
    queryFn: () => api.fetchLead(id!),
    enabled: !!id,
    initialData: () => (id ? findLeadInCache(qc, id) : undefined),
    initialDataUpdatedAt: 0,
  });
}

export const useActivities = (leadId: string | null | undefined) =>
  useQuery({ queryKey: qk.activities(leadId ?? ""), queryFn: () => api.fetchActivities(leadId!), enabled: !!leadId });

export const useDashboard = () => useQuery({ queryKey: qk.dashboard(), queryFn: api.fetchDashboard });

export const useDueFollowups = () => useQuery({ queryKey: qk.due(), queryFn: () => api.fetchDueFollowups(50) });

export const useKanban = (newLimit: number) => useQuery({ queryKey: qk.kanban(newLimit), queryFn: () => api.fetchKanban(newLimit), placeholderData: (prev) => prev });

export function useCrmList(q: api.CrmQuery, todayStartIso: string | undefined) {
  return useInfiniteQuery({
    queryKey: qk.crm(q),
    queryFn: ({ pageParam }) => api.fetchCrmPage(q, pageParam, todayStartIso ?? new Date().toISOString()),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length === api.CRM_PAGE_SIZE ? all.length : undefined),
    enabled: !q.overdueOnly || !!todayStartIso,
  });
}

export function useSettings() {
  return useQuery({ queryKey: qk.settings(), queryFn: api.fetchSettings, placeholderData: DEFAULT_SETTINGS });
}

export const useTemplates = () => useQuery({ queryKey: qk.templates(), queryFn: api.fetchTemplates });

// ───────────────────────── Cache: localizar e atualizar um lead em todas as listas ─────────────────────────

type LeadCache = Lead | Lead[] | { pages: Lead[][]; pageParams: unknown[] } | null | undefined;

function mapCache(data: LeadCache, id: string, fn: (l: Lead) => Lead): LeadCache {
  if (!data) return data;
  if (Array.isArray(data)) return data.map((l) => (l.id === id ? fn(l) : l));
  if ("pages" in data) return { ...data, pages: data.pages.map((p) => p.map((l) => (l.id === id ? fn(l) : l))) };
  if ("id" in data) return data.id === id ? fn(data) : data;
  return data;
}

export function findLeadInCache(qc: QueryClient, id: string): Lead | undefined {
  for (const [, data] of qc.getQueriesData<LeadCache>({ queryKey: ["leads"] })) {
    if (!data) continue;
    if (Array.isArray(data)) {
      const f = data.find((l) => l.id === id);
      if (f) return f;
    } else if ("pages" in data) {
      for (const p of data.pages) {
        const f = p.find((l) => l.id === id);
        if (f) return f;
      }
    } else if ("id" in data && data.id === id) return data;
  }
  return undefined;
}

export function patchLeadEverywhere(qc: QueryClient, id: string, patch: Partial<Lead>) {
  qc.setQueriesData<LeadCache>({ queryKey: ["leads"] }, (data) => mapCache(data, id, (l) => ({ ...l, ...patch })));
}

function snapshot(qc: QueryClient) {
  return qc.getQueriesData<LeadCache>({ queryKey: ["leads"] });
}

function restore(qc: QueryClient, snap: ReturnType<typeof snapshot>) {
  for (const [key, data] of snap) qc.setQueryData(key, data);
}

function refreshAfterCrm(qc: QueryClient, leadId: string) {
  void qc.invalidateQueries({ queryKey: ["leads"] });
  void qc.invalidateQueries({ queryKey: qk.dashboard() });
  void qc.invalidateQueries({ queryKey: qk.activities(leadId) });
}

/** Toast com "Desfazer" (5s) que restaura o estado anterior no servidor. */
export function useUndoToast() {
  const qc = useQueryClient();
  return (title: string, token: UndoToken, description?: string) => {
    if (!token.changed) return;
    toast.success(title, {
      description,
      duration: 5000,
      action: {
        label: "Desfazer",
        onClick: () => {
          api
            .undo(token)
            .then(() => toast("Alteração desfeita"))
            .catch((err) => toast.error(errorMessage(err)))
            .finally(() => refreshAfterCrm(qc, token.leadId));
        },
      },
    });
  };
}

// ───────────────────────── Mutations do CRM ─────────────────────────

const now = () => new Date().toISOString();
const REPLIED: LeadStatus[] = ["respondeu", "negociando", "fechado"];

/** Prévia otimista do que set_lead_status faz no banco. */
export function optimisticStatusPatch(lead: Lead, status: LeadStatus, followUpDays: number): Partial<Lead> {
  const t = now();
  return {
    status,
    lastContactAt: status !== "novo" ? (lead.lastContactAt ?? t) : lead.lastContactAt,
    repliedAt: REPLIED.includes(status) ? (lead.repliedAt ?? t) : lead.repliedAt,
    closedAt: status === "fechado" ? (lead.closedAt ?? t) : null,
    followUpAt:
      status === "fechado" || status === "sem_interesse"
        ? null
        : status === "contatado" && !lead.followUpAt
          ? new Date(Date.now() + followUpDays * 86_400_000).toISOString()
          : lead.followUpAt,
    statusUpdatedAt: t,
  };
}

export function useSetStatus() {
  const qc = useQueryClient();
  const undoToast = useUndoToast();
  const settings = qc.getQueryData<Settings>(qk.settings()) ?? DEFAULT_SETTINGS;
  return useMutation({
    mutationFn: ({ lead, status }: { lead: Lead; status: LeadStatus }) => api.setLeadStatus(lead.id, status),
    onMutate: async ({ lead, status }) => {
      await qc.cancelQueries({ queryKey: ["leads"] });
      const snap = snapshot(qc);
      patchLeadEverywhere(qc, lead.id, optimisticStatusPatch(lead, status, settings.followUpDays));
      return { snap };
    },
    onError: (err, _v, ctx) => {
      if (ctx) restore(qc, ctx.snap);
      toast.error(errorMessage(err));
    },
    onSuccess: (token, { lead, status }) => {
      const from = getStatus(lead.status).label;
      undoToast(lead.name, token, `${from} → ${getStatus(status).label}`);
    },
    onSettled: (_d, _e, { lead }) => refreshAfterCrm(qc, lead.id),
  });
}

/** WhatsApp aberto: 'novo' → 'contatado', último contato agora, follow-up se vazio. */
export function useRegisterWhatsApp() {
  const qc = useQueryClient();
  const undoToast = useUndoToast();
  const settings = qc.getQueryData<Settings>(qk.settings()) ?? DEFAULT_SETTINGS;
  return useMutation({
    mutationFn: ({ lead, message }: { lead: Lead; message: string }) => api.registerContact(lead.id, "whatsapp", message),
    onMutate: async ({ lead }) => {
      await qc.cancelQueries({ queryKey: ["leads"] });
      const snap = snapshot(qc);
      const t = now();
      patchLeadEverywhere(qc, lead.id, {
        status: lead.status === "novo" ? "contatado" : lead.status,
        lastContactAt: t,
        followUpAt: lead.followUpAt ?? new Date(Date.now() + settings.followUpDays * 86_400_000).toISOString(),
      });
      return { snap };
    },
    onError: (err, _v, ctx) => {
      if (ctx) restore(qc, ctx.snap);
      toast.error(errorMessage(err));
    },
    onSuccess: (token, { lead }) => {
      undoToast(lead.status === "novo" ? "Marcado como Contatado" : "Contato registrado", token, lead.name);
    },
    onSettled: (_d, _e, { lead }) => refreshAfterCrm(qc, lead.id),
  });
}

/** Ligação: registra atividade e último contato (sem toast, para não atrapalhar a chamada). */
export function useRegisterCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lead: Lead) => api.registerContact(lead.id, "ligacao"),
    onMutate: (lead) => patchLeadEverywhere(qc, lead.id, { lastContactAt: now() }),
    onError: (err) => toast.error(errorMessage(err)),
    onSettled: (_d, _e, lead) => refreshAfterCrm(qc, lead.id),
  });
}

export function useSetFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lead, at }: { lead: Lead; at: string | null }) => api.setFollowUp(lead.id, at),
    onMutate: async ({ lead, at }) => {
      await qc.cancelQueries({ queryKey: ["leads"] });
      const snap = snapshot(qc);
      patchLeadEverywhere(qc, lead.id, { followUpAt: at });
      return { snap };
    },
    onError: (err, _v, ctx) => {
      if (ctx) restore(qc, ctx.snap);
      toast.error(errorMessage(err));
    },
    onSettled: (_d, _e, { lead }) => refreshAfterCrm(qc, lead.id),
  });
}

export function useCompleteFollowUp() {
  const qc = useQueryClient();
  const undoToast = useUndoToast();
  return useMutation({
    mutationFn: (lead: Lead) => api.completeFollowUp(lead.id),
    onMutate: async (lead) => {
      await qc.cancelQueries({ queryKey: ["leads"] });
      const snap = snapshot(qc);
      patchLeadEverywhere(qc, lead.id, { followUpAt: null });
      return { snap };
    },
    onError: (err, _v, ctx) => {
      if (ctx) restore(qc, ctx.snap);
      toast.error(errorMessage(err));
    },
    onSuccess: (token, lead) => undoToast("Follow-up concluído", token, lead.name),
    onSettled: (_d, _e, lead) => refreshAfterCrm(qc, lead.id),
  });
}

export function useUpdateNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, notes }: { leadId: string; notes: string }) => api.updateNotes(leadId, notes),
    onMutate: ({ leadId, notes }) => patchLeadEverywhere(qc, leadId, { notes }),
    onError: (err) => toast.error(errorMessage(err)),
  });
}

// ───────────────────────── Configurações e modelos ─────────────────────────

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.saveSettings,
    onSuccess: (s) => {
      qc.setQueryData(qk.settings(), s);
      toast.success("Configurações salvas");
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
}

export function useSaveTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.saveTemplate,
    onSuccess: (t) => {
      qc.setQueryData<MessageTemplate[]>(qk.templates(), (prev) => {
        const list = prev ?? [];
        return list.some((x) => x.id === t.id) ? list.map((x) => (x.id === t.id ? t : x)) : [...list, t];
      });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteTemplate,
    onSuccess: (_d, id) => qc.setQueryData<MessageTemplate[]>(qk.templates(), (prev) => (prev ?? []).filter((t) => t.id !== id)),
    onError: (err) => toast.error(errorMessage(err)),
  });
}
