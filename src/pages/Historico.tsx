import { useMemo } from "react";
import { History, Search } from "lucide-react";
import { SearchItem, SearchItemSkeleton } from "@/components/searches/SearchItem";
import { EmptyState } from "@/components/stark/EmptyState";
import { ErrorState } from "@/components/stark/ErrorState";
import { PageHeader } from "@/components/stark/PageHeader";
import { Button } from "@/components/ui/button";
import { useSimulatedLoad } from "@/hooks/use-simulated-load";
import { useApp } from "@/store/app-store";
import { useUI } from "@/store/ui-store";

export default function HistoricoPage() {
  const { searches } = useApp();
  const { openWizard } = useUI();
  const { status, retry } = useSimulatedLoad("historico");
  const sorted = useMemo(() => [...searches].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [searches]);

  return (
    <div>
      <PageHeader
        title="Histórico"
        description="Suas buscas anteriores. Refazer usa o cache quando a busca é recente."
        actions={
          <Button onClick={() => openWizard()} className="hidden md:inline-flex">
            <Search /> Nova busca
          </Button>
        }
      />
      {status === "loading" && (
        <ul className="grid grid-cols-1 gap-3" aria-busy="true">
          {Array.from({ length: 5 }, (_, i) => (
            <SearchItemSkeleton key={i} variant="full" />
          ))}
        </ul>
      )}
      {status === "error" && <ErrorState onRetry={retry} />}
      {status === "ready" &&
        (sorted.length === 0 ? (
          <EmptyState
            icon={History}
            title="Nenhuma busca ainda"
            description="Suas buscas aparecem aqui para você ver de novo ou refazer."
            action={
              <Button onClick={() => openWizard()}>
                <Search /> Fazer a primeira busca
              </Button>
            }
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3">
            {sorted.map((s) => (
              <SearchItem key={s.id} search={s} variant="full" />
            ))}
          </ul>
        ))}
    </div>
  );
}
