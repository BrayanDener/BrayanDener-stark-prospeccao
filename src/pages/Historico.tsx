import { useState } from "react";
import { History, Search } from "lucide-react";
import { SearchItem, SearchItemSkeleton } from "@/components/searches/SearchItem";
import { EmptyState } from "@/components/stark/EmptyState";
import { ErrorState } from "@/components/stark/ErrorState";
import { PageHeader } from "@/components/stark/PageHeader";
import { Button } from "@/components/ui/button";
import { useSearches } from "@/data/queries";
import { useUI } from "@/store/ui-store";

const PAGE = 30;

export default function HistoricoPage() {
  const { openWizard } = useUI();
  const [limit, setLimit] = useState(PAGE);
  const q = useSearches(limit);
  const searches = q.data ?? [];

  return (
    <div>
      <PageHeader
        title="Histórico"
        description="Suas buscas anteriores. Refazer dentro do prazo do cache não gasta requisições do Google."
        actions={
          <Button onClick={() => openWizard()} className="hidden md:inline-flex">
            <Search /> Nova busca
          </Button>
        }
      />
      {q.isLoading && (
        <ul className="grid grid-cols-1 gap-3" aria-busy="true">
          {Array.from({ length: 5 }, (_, i) => (
            <SearchItemSkeleton key={i} variant="full" />
          ))}
        </ul>
      )}
      {q.isError && <ErrorState onRetry={() => void q.refetch()} />}
      {q.isSuccess &&
        (searches.length === 0 ? (
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
          <>
            <ul className="grid grid-cols-1 gap-3">
              {searches.map((s) => (
                <SearchItem key={s.id} search={s} variant="full" />
              ))}
            </ul>
            {searches.length === limit && (
              <div className="mt-6 flex justify-center">
                <Button variant="secondary" onClick={() => setLimit((l) => l + PAGE)} disabled={q.isFetching}>
                  {q.isFetching ? "Carregando…" : "Carregar mais"}
                </Button>
              </div>
            )}
          </>
        ))}
    </div>
  );
}
