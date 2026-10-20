/**
 * Estado da Etapa 1 (em memória, com mocks). Na Etapa 2 estas ações passam a
 * chamar o Supabase; os componentes continuam usando o mesmo hook useApp().
 */
import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from "react";
import { getStatus } from "@/config/status";
import { addDays } from "@/lib/format";
import { uid } from "@/lib/utils";
import { buildInitialData, DEFAULT_SETTINGS, generateSearchResults, MOCK_TEMPLATES } from "@/mocks";
import type { Activity, Lead, LeadStatus, MessageTemplate, Search, SearchParams, Settings } from "@/types";

interface State {
  leads: Lead[];
  searches: Search[];
  templates: MessageTemplate[];
  settings: Settings;
}

type Action =
  | { type: "patchLead"; id: string; patch: (lead: Lead) => Partial<Lead> }
  | { type: "addSearch"; search: Search; leads: Lead[] }
  | { type: "saveTemplate"; template: MessageTemplate }
  | { type: "deleteTemplate"; id: string }
  | { type: "updateSettings"; patch: Partial<Settings> };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "patchLead":
      return { ...state, leads: state.leads.map((l) => (l.id === action.id ? { ...l, ...action.patch(l) } : l)) };
    case "addSearch":
      return { ...state, searches: [action.search, ...state.searches], leads: [...action.leads, ...state.leads] };
    case "saveTemplate": {
      const exists = state.templates.some((t) => t.id === action.template.id);
      return {
        ...state,
        templates: exists ? state.templates.map((t) => (t.id === action.template.id ? action.template : t)) : [...state.templates, action.template],
      };
    }
    case "deleteTemplate":
      return { ...state, templates: state.templates.filter((t) => t.id !== action.id) };
    case "updateSettings":
      return { ...state, settings: { ...state.settings, ...action.patch } };
  }
}

function init(): State {
  const { leads, searches } = buildInitialData();
  return { leads, searches, templates: MOCK_TEMPLATES, settings: DEFAULT_SETTINGS };
}

const activity = (type: Activity["type"], text: string): Activity => ({ id: uid("act"), type, text, at: new Date().toISOString() });

interface AppContextValue extends State {
  recentCities: string[];
  getLead: (id: string) => Lead | undefined;
  getSearch: (id: string) => Search | undefined;
  updateStatus: (id: string, status: LeadStatus) => void;
  addNote: (id: string, text: string) => void;
  setFollowUp: (id: string, iso: string | null) => void;
  completeFollowUp: (id: string) => void;
  addToCrm: (id: string) => void;
  runSearch: (params: SearchParams) => Promise<string>;
  saveTemplate: (template: MessageTemplate) => void;
  deleteTemplate: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init);

  const patchLead = useCallback((id: string, patch: (lead: Lead) => Partial<Lead>) => dispatch({ type: "patchLead", id, patch }), []);

  const updateStatus = useCallback(
    (id: string, status: LeadStatus) =>
      patchLead(id, (l) => {
        if (l.status === status) return {};
        const now = new Date();
        const firstContact = status !== "novo" && !l.lastContactAt;
        return {
          status,
          inCrm: true,
          lastContactAt: firstContact ? now.toISOString() : l.lastContactAt,
          nextFollowUpAt:
            status === "fechado" || status === "sem_interesse"
              ? null
              : firstContact && !l.nextFollowUpAt
                ? addDays(now, state.settings.followUpDays).toISOString()
                : l.nextFollowUpAt,
          activities: [activity("status", `Status alterado para ${getStatus(status).label}`), ...l.activities],
        };
      }),
    [patchLead, state.settings.followUpDays],
  );

  const addNote = useCallback(
    (id: string, text: string) =>
      patchLead(id, (l) => {
        const note = { id: uid("note"), text, at: new Date().toISOString() };
        return { notes: [note, ...l.notes], inCrm: true, activities: [activity("nota", "Anotação adicionada"), ...l.activities] };
      }),
    [patchLead],
  );

  const setFollowUp = useCallback(
    (id: string, iso: string | null) =>
      patchLead(id, (l) => ({
        nextFollowUpAt: iso,
        inCrm: true,
        activities: [activity("followup", iso ? "Follow-up agendado" : "Follow-up removido"), ...l.activities],
      })),
    [patchLead],
  );

  const completeFollowUp = useCallback(
    (id: string) => patchLead(id, (l) => ({ nextFollowUpAt: null, activities: [activity("followup", "Follow-up concluído"), ...l.activities] })),
    [patchLead],
  );

  const addToCrm = useCallback((id: string) => patchLead(id, () => ({ inCrm: true })), [patchLead]);

  const runSearch = useCallback(async (params: SearchParams) => {
    // Etapa 1: simula a Edge Function (1,5s) e gera resultados determinísticos.
    await new Promise((r) => setTimeout(r, 1500));
    const search: Search = { id: uid("busca"), ...params, city: params.city.trim(), createdAt: new Date().toISOString() };
    const leads = generateSearchResults(search, { searchId: search.id, createdAt: search.createdAt });
    dispatch({ type: "addSearch", search, leads });
    return search.id;
  }, []);

  const saveTemplate = useCallback((template: MessageTemplate) => dispatch({ type: "saveTemplate", template }), []);
  const deleteTemplate = useCallback((id: string) => dispatch({ type: "deleteTemplate", id }), []);
  const updateSettings = useCallback((patch: Partial<Settings>) => dispatch({ type: "updateSettings", patch }), []);

  const value = useMemo<AppContextValue>(() => {
    const recentCities: string[] = [];
    for (const s of [...state.searches].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
      if (!recentCities.some((c) => c.toLowerCase() === s.city.toLowerCase())) recentCities.push(s.city);
      if (recentCities.length === 5) break;
    }
    return {
      ...state,
      recentCities,
      getLead: (id) => state.leads.find((l) => l.id === id),
      getSearch: (id) => state.searches.find((s) => s.id === id),
      updateStatus,
      addNote,
      setFollowUp,
      completeFollowUp,
      addToCrm,
      runSearch,
      saveTemplate,
      deleteTemplate,
      updateSettings,
    };
  }, [state, updateStatus, addNote, setFollowUp, completeFollowUp, addToCrm, runSearch, saveTemplate, deleteTemplate, updateSettings]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp precisa estar dentro de <AppProvider>");
  return ctx;
}
