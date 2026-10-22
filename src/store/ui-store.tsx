import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { SearchParams } from "@/types";

export type WizardStep = 1 | 2 | 3;

export interface WizardOpenOptions {
  initial?: Partial<SearchParams>;
  step?: WizardStep;
}

interface UIContextValue {
  wizard: { open: boolean; options: WizardOpenOptions; key: number };
  openWizard: (options?: WizardOpenOptions) => void;
  closeWizard: () => void;
  leadDetail: { id: string | null; focusNotes: boolean };
  openLead: (id: string, opts?: { focusNotes?: boolean }) => void;
  closeLead: () => void;
  whatsappLeadId: string | null;
  openWhatsApp: (id: string) => void;
  closeWhatsApp: () => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [wizard, setWizard] = useState<UIContextValue["wizard"]>({ open: false, options: {}, key: 0 });
  const [leadDetail, setLeadDetail] = useState<UIContextValue["leadDetail"]>({ id: null, focusNotes: false });
  const [whatsappLeadId, setWhatsappLeadId] = useState<string | null>(null);

  const openWizard = useCallback((options: WizardOpenOptions = {}) => setWizard((w) => ({ open: true, options, key: w.key + 1 })), []);
  const closeWizard = useCallback(() => setWizard((w) => ({ ...w, open: false })), []);
  const openLead = useCallback((id: string, opts?: { focusNotes?: boolean }) => setLeadDetail({ id, focusNotes: !!opts?.focusNotes }), []);
  const closeLead = useCallback(() => setLeadDetail((d) => ({ ...d, id: null })), []);
  const openWhatsApp = useCallback((id: string) => setWhatsappLeadId(id), []);
  const closeWhatsApp = useCallback(() => setWhatsappLeadId(null), []);

  const value = useMemo(
    () => ({ wizard, openWizard, closeWizard, leadDetail, openLead, closeLead, whatsappLeadId, openWhatsApp, closeWhatsApp }),
    [wizard, openWizard, closeWizard, leadDetail, openLead, closeLead, whatsappLeadId, openWhatsApp, closeWhatsApp],
  );
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI precisa estar dentro de <UIProvider>");
  return ctx;
}
