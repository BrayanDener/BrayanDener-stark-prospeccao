import { Suspense, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { LeadDetailPanel } from "@/components/leads/LeadDetailPanel";
import { WhatsAppPanel } from "@/components/whatsapp/WhatsAppPanel";
import { SearchWizard } from "@/components/wizard/SearchWizard";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "./BottomNav";
import { MobileHeader } from "./MobileHeader";
import { Sidebar } from "./Sidebar";

function PageFallback() {
  return (
    <div className="space-y-3 pt-4 md:pt-8" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-64 max-w-full" />
      <Skeleton className="mt-6 h-40 w-full rounded-lg" />
    </div>
  );
}

export function AppShell() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="min-h-[100dvh]">
      <Sidebar />
      <div className="md:pl-64">
        <MobileHeader />
        <main className="pb-nav mx-auto w-full max-w-6xl px-4 md:px-8">
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <BottomNav />
      <SearchWizard />
      <LeadDetailPanel />
      <WhatsAppPanel />
    </div>
  );
}
