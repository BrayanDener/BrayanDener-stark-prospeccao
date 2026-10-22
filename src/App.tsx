import { lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { UpdatePrompt } from "@/components/layout/UpdatePrompt";
import { LogoMark } from "@/components/stark/Logo";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppError } from "@/lib/errors";
import DashboardPage from "@/pages/Dashboard";
import LeadsPage from "@/pages/Leads";
import LoginPage from "@/pages/Login";
import { AuthProvider, useAuth } from "@/store/auth";
import { UIProvider } from "@/store/ui-store";

// Telas menos usadas carregam sob demanda (o CRM traz o @dnd-kit junto).
const CrmPage = lazy(() => import("@/pages/Crm"));
const HistoricoPage = lazy(() => import("@/pages/Historico"));
const ModelosPage = lazy(() => import("@/pages/Modelos"));
const ConfiguracoesPage = lazy(() => import("@/pages/Configuracoes"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      // Sessão expirada ou sem permissão: não adianta tentar de novo.
      retry: (count, err) => !(err instanceof AppError && (err.code === "UNAUTHORIZED" || err.code === "FORBIDDEN")) && count < 2,
    },
  },
});

function Splash() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center" aria-busy="true" aria-label="Carregando">
      <LogoMark size={44} className="animate-pulse" />
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Splash />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          <AuthProvider>
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
            <UpdatePrompt />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </MotionConfig>
  );
}
