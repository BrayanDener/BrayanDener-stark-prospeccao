import { lazy } from "react";
import { MotionConfig } from "framer-motion";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardPage from "@/pages/Dashboard";
import LeadsPage from "@/pages/Leads";
import LoginPage from "@/pages/Login";
import { AppProvider } from "@/store/app-store";
import { isLoggedIn } from "@/store/session";
import { UIProvider } from "@/store/ui-store";

// Telas menos usadas carregam sob demanda (o CRM traz o @dnd-kit junto).
const CrmPage = lazy(() => import("@/pages/Crm"));
const HistoricoPage = lazy(() => import("@/pages/Historico"));
const ModelosPage = lazy(() => import("@/pages/Modelos"));
const ConfiguracoesPage = lazy(() => import("@/pages/Configuracoes"));

function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (!isLoggedIn()) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={300}>
        <AppProvider>
          <BrowserRouter>
            <UIProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  element={
                    <RequireAuth>
                      <AppShell />
                    </RequireAuth>
                  }
                >
                  <Route index element={<DashboardPage />} />
                  <Route path="leads" element={<LeadsPage />} />
                  <Route path="crm" element={<CrmPage />} />
                  <Route path="historico" element={<HistoricoPage />} />
                  <Route path="modelos" element={<ModelosPage />} />
                  <Route path="configuracoes" element={<ConfiguracoesPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </UIProvider>
          </BrowserRouter>
          <Toaster />
        </AppProvider>
      </TooltipProvider>
    </MotionConfig>
  );
}
