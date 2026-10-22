import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpDown, Database, Download, FilterX, LayoutList, Loader2, Map as MapIcon, MapPin, RefreshCw, Search, SearchX, SlidersHorizontal, Store, UsersRound } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { LeadCard, LeadCardSkeleton } from "@/components/leads/LeadCard";
import { EmptyState } from "@/components/stark/EmptyState";
import { ErrorState } from "@/components/stark/ErrorState";
import { FilterChip } from "@/components/stark/FilterChip";
import { PageHeader } from "@/components/stark/PageHeader";
import { Segmented } from "@/components/stark/Segmented";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getNiche } from "@/config/niches";
import { getService } from "@/config/services";
import { STATUSES, getStatus } from "@/config/status";
import { runSearch } from "@/data/api";
import { qk, useAllLeads, useSearch, useSearchLeads, useSettings } from "@/data/queries";
import { errorMessage } from "@/lib/errors";
import { SORT_OPTIONS, applyListFilters, applyServiceFilter, isContacted, sortLeads, type LeadListFilters, type SortKey } from "@/lib/filters";
import { formatDayMonth, formatNumber, formatRelativeDay } from "@/lib/format";
import { scoreLead } from "@/lib/score";
import { cn } from "@/lib/utils";
import { useUI } from "@/store/ui-store";
import type { Lead, LeadStatus, Search as SearchType, ServiceKey } from "@/types";

const LeadsMap = lazy(() => import("@/components/leads/LeadsMap"));
const PAGE = 30;

export default function LeadsPage() {
  const [params] = useSearchParams();
  const searchId = params.get("busca");
  const { openWizard } = useUI();
  const { data: settings } = useSettings();
  const searchQ = useSearch(searchId);
  const searchLeadsQ = useSearchLeads(searchId);
  const allLeadsQ = useAllLeads(!searchId);
  const search = searchQ.data ?? undefined;

  const hideDefault = settings?.hideContacted ?? true;
  const defaultFilters: LeadListFilters = { query: "", status: "todos", noSite: false, mobileOnly: false, hideContacted: hideDefault };
  const [filters, setFilters] = useState<LeadListFilters>(defaultFilters);
  const [sort, setSort] = useState<SortKey>("score");
  const [view, setView] = useState<"lista" | "mapa">("lista");
  const [showAllLocal, setShowAllLocal] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  // Nova busca → filtros e paginação voltam ao padrão.
  useEffect(() => {
    setFilters({ query: "", status: "todos", noSite: false, mobileOnly: false, hideContacted: hideDefault });
    setShowAllLocal(false);
    setLimit(PAGE);
  }, [searchId, hideDefault]);

  const leadsQ = searchId ? searchLeadsQ : allLeadsQ;
  const base = useMemo(() => leadsQ.data ?? [], [leadsQ.data]);
  const minReviewsBusy = settings?.minReviewsBusy ?? 50;
  const showAll = !!search?.showAll || showAllLocal;
  const serviceOf = (l: Lead): ServiceKey => search?.service ?? l.lastService ?? "outro";

  const filtered = useMemo(
    () => (search ? applyServiceFilter(base, search.service, { minReviewsBusy, showAll }) : { visible: base, removed: 0, outside: new Set<string>() }),
    [base, search, minReviewsBusy, showAll],
  );
  const scores = useMemo(() => new Map(filtered.visible.map((l) => [l.id, scoreLead(l, serviceOf(l)).total])), [filtered.visible, search]);
  const contactedCount = filtered.visible.filter(isContacted).length;
  const visible = useMemo(() => sortLeads(applyListFilters(filtered.visible, filters), sort, (l) => scores.get(l.id) ?? 0), [filtered.visible, filters, sort, scores]);

  const hasActiveFilters = filters.query !== "" || filters.status !== "todos" || filters.noSite || filters.mobileOnly;
  const set = <K extends keyof LeadListFilters>(key: K, value: LeadListFilters[K]) => setFilters((f) => ({ ...f, [key]: value }));

  const status: "loading" | "error" | "ready" = (searchId && searchQ.isLoading) || leadsQ.isLoading ? "loading" : leadsQ.isError || searchQ.isError ? "error" : "ready";

  // Cascata de entrada só na primeira renderização da lista.
  const animatedOnce = useRef(false);
  const animateIn = status === "ready" && !animatedOnce.current;
  useEffect(() => {
    if (status === "ready") animatedOnce.current = true;
  }, [status]);

  const exportXlsx = async () => {
    try {
      const { exportLeadsXlsx } = await import("@/lib/export-xlsx");
      await exportLeadsXlsx(visible, { scores, city: search?.city ?? "todas", niche: search ? (getNiche(search.niche)?.label ?? search.niche) : "todos" });
    } catch (err) {
      console.error("[export]", err);
      toast.error("Não foi possível gerar a planilha agora.");
    }
  };

  if (searchId && searchQ.isSuccess && !search) {
    return (
      <div className="pt-8">
        <EmptyState
          icon={SearchX}
          title="Busca não encontrada"
          description="Ela pode ter sido apagada ou o link está incompleto."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="secondary" asChild>
                <Link to="/leads">Ver todos os leads</Link>
              </Button>
              <Button onClick={() => openWizard()}>
                <Search /> Nova busca
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div>
      {searchId ? (
        search ? (
          <SearchContext search={search} onEdit={() => openWizard({ initial: { service: search.service, city: search.city, niche: search.niche, showAll: search.showAll }, step: 1 })} />
        ) : (
          <div className="space-y-3 pb-4 pt-2 md:pt-8">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-8 w-80 max-w-full" />
          </div>
        )
      ) : (
        <PageHeader
          title="Leads"
          description="Todos os leads encontrados nas suas buscas."
          actions={
            <Button onClick={() => openWizard()} className="hidden md:inline-flex">
              <Search /> Nova busca
            </Button>
          }
        />
      )}

      {search?.fromCache && <CacheNotice search={search} />}

      {/* Resumo */}
      <div className="mb-1 min-h-6 text-sm text-muted-foreground" aria-live="polite">
        {status === "loading" ? (
          <Skeleton className="h-5 w-72 max-w-full" />
        ) : status === "ready" ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              <span className="font-semibold tabular-nums text-foreground">{formatNumber(filtered.visible.length)}</span>{" "}
              {search && !showAll ? "leads qualificados" : "leads"}
            </span>
            {filtered.removed > 0 && (
              <>
                <span aria-hidden>·</span>
                <span>
                  <span className="tabular-nums">{filtered.removed}</span> {filtered.removed === 1 ? "empresa removida" : "empresas removidas"} pelo filtro
                  {showAll && " (exibidas)"}
                </span>
                {!search?.showAll && (
                  <button type="button" onClick={() => setShowAllLocal((v) => !v)} className="font-medium text-primary hover:text-primary-hover">
                    {showAllLocal ? "Aplicar filtro" : "Mostrar todas"}
                  </button>
                )}
              </>
            )}
            <span aria-hidden>·</span>
            <span>
              <span className="tabular-nums">{contactedCount}</span> já contatados
            </span>
          </p>
        ) : null}
      </div>

      {/* Barra de filtros fixa */}
      <div className="sticky z-30 -mx-4 border-b border-border bg-background/95 px-4 pb-3 pt-3 md:-mx-8 md:px-8" style={{ top: "var(--safe-top)" }}>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-tertiary" aria-hidden />
            <Input value={filters.query} onChange={(e) => set("query", e.target.value)} placeholder="Buscar por nome" aria-label="Buscar por nome" className="pl-10 md:h-9" type="search" />
          </div>
          <Segmented
            label="Visualização"
            value={view}
            onChange={setView}
            iconOnlyMobile
            options={[
              { value: "lista", label: "Lista", icon: LayoutList },
              { value: "mapa", label: "Mapa", icon: MapIcon },
            ]}
          />
          <Button variant="secondary" size="icon" className="md:h-9 md:w-9" onClick={exportXlsx} disabled={visible.length === 0} aria-label="Exportar .xlsx" title="Exportar .xlsx">
            <Download />
          </Button>
        </div>
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 no-scrollbar md:mx-0 md:flex-wrap md:px-0">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <FilterChip active={filters.status !== "todos"} showCheck={false}>
                {filters.status === "todos" ? "Status" : getStatus(filters.status).label}
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
              </FilterChip>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={filters.status} onValueChange={(v) => set("status", v as LeadStatus | "todos")}>
                <DropdownMenuRadioItem value="todos">Todos</DropdownMenuRadioItem>
                {STATUSES.map((s) => (
                  <DropdownMenuRadioItem key={s.key} value={s.key}>
                    <span className={cn("h-2 w-2 rounded-full", s.dot)} aria-hidden />
                    {s.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <FilterChip active={filters.noSite} onClick={() => set("noSite", !filters.noSite)}>
            Sem site
          </FilterChip>
          <FilterChip active={filters.mobileOnly} onClick={() => set("mobileOnly", !filters.mobileOnly)}>
            Com celular
          </FilterChip>
          <FilterChip active={filters.hideContacted} onClick={() => set("hideContacted", !filters.hideContacted)}>
            Ocultar já contatados
          </FilterChip>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <FilterChip active={false} showCheck={false} className="md:ml-auto">
                <ArrowUpDown className="h-3.5 w-3.5" aria-hidden />
                {SORT_OPTIONS.find((o) => o.key === sort)?.label}
              </FilterChip>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                {SORT_OPTIONS.map((o) => (
                  <DropdownMenuRadioItem key={o.key} value={o.key}>
                    {o.label}
                    {o.key === "score" && <span className="text-muted-foreground">(maior primeiro)</span>}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="pt-4">
        {status === "loading" && (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2" aria-busy="true" aria-label="Carregando leads">
            {Array.from({ length: 6 }, (_, i) => (
              <LeadCardSkeleton key={i} />
            ))}
          </div>
        )}

        {status === "error" && (
          <ErrorState
            description="Não conseguimos carregar os leads. Seus dados estão seguros."
            onRetry={() => {
              void leadsQ.refetch();
              void searchQ.refetch();
            }}
          />
        )}

        {status === "ready" && view === "mapa" && (
          <Suspense fallback={<Skeleton className="h-[60dvh] min-h-[360px] w-full rounded-lg" />}>
            <LeadsMap leads={visible} scores={scores} center={search?.lat != null && search?.lng != null ? { lat: search.lat, lng: search.lng } : null} />
          </Suspense>
        )}

        {status === "ready" && view === "lista" && (
          <>
            {filtered.visible.length === 0 ? (
              <EmptyState
                icon={search ? FilterX : UsersRound}
                title={search ? (base.length === 0 ? "Nenhuma empresa nesta busca" : "Nenhuma empresa passou no filtro") : "Nenhum lead ainda"}
                description={
                  search
                    ? base.length === 0
                      ? "Tente outro nicho ou uma cidade vizinha."
                      : "Todas as empresas encontradas já atendem o que você oferece. Veja todas ou mude o serviço."
                    : "Faça sua primeira busca para encontrar empresas."
                }
                action={
                  search && base.length > 0 ? (
                    <Button variant="secondary" onClick={() => setShowAllLocal(true)}>
                      Mostrar todas
                    </Button>
                  ) : (
                    <Button onClick={() => openWizard()}>
                      <Search /> Nova busca
                    </Button>
                  )
                }
              />
            ) : visible.length === 0 ? (
              <EmptyState
                icon={FilterX}
                title="Nenhum lead com esses filtros"
                description={filters.hideContacted && !hasActiveFilters ? "Todos os leads desta lista já foram contatados." : "Tente remover algum filtro."}
                action={
                  <Button variant="secondary" onClick={() => setFilters({ ...defaultFilters, hideContacted: false })}>
                    Limpar filtros
                  </Button>
                }
              />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {visible.slice(0, limit).map((lead, i) => (
                    <LeadCard key={lead.id} lead={lead} score={scores.get(lead.id) ?? 0} index={i} animateIn={animateIn} outsideFilter={showAll && filtered.outside.has(lead.id)} />
                  ))}
                </div>
                {visible.length > limit && (
                  <div className="mt-6 flex justify-center">
                    <Button variant="secondary" onClick={() => setLimit((l) => l + PAGE)}>
                      Mostrar mais ({formatNumber(visible.length - limit)})
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SearchContext({ search, onEdit }: { search: SearchType; onEdit: () => void }) {
  const service = getService(search.service);
  const Icon = service.icon;
  return (
    <div className="pb-4 pt-2 md:pt-8">
      <p className="mb-1.5 text-sm text-muted-foreground">Resultados da busca · {formatRelativeDay(search.createdAt)}</p>
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tighter md:text-3xl">
          {getNiche(search.niche)?.label} em {search.city}
        </h1>
        <Button variant="secondary" onClick={onEdit} className="shrink-0">
          <SlidersHorizontal /> Alterar
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary-muted px-3 font-medium text-primary-hover">
          <Icon className="h-4 w-4" aria-hidden /> {service.label}
        </span>
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-muted-foreground">
          <MapPin className="h-4 w-4" aria-hidden /> {search.city}
        </span>
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-muted-foreground">
          <Store className="h-4 w-4" aria-hidden /> {getNiche(search.niche)?.label}
        </span>
      </div>
    </div>
  );
}

/** "Resultados salvos em 12/10 · Atualizar do Google" (reenvia com forceRefresh). */
function CacheNotice({ search }: { search: SearchType }) {
  const { data: source } = useSearch(search.sourceSearchId);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);
  const savedAt = source?.createdAt ?? search.createdAt;

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await runSearch({ service: search.service, city: search.city, niche: search.niche, showAll: search.showAll, forceRefresh: true });
      qc.setQueryData(qk.searchLeads(res.searchId), res.leads);
      void qc.invalidateQueries({ queryKey: ["searches"] });
      void qc.invalidateQueries({ queryKey: qk.dashboard() });
      navigate(`/leads?busca=${res.searchId}`, { replace: true });
      toast.success("Resultados atualizados do Google", { description: `${res.totalFound} empresas · ${res.googleRequests} requisições` });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
      <Database className="h-4 w-4 text-tertiary" aria-hidden />
      <span>Resultados salvos em {formatDayMonth(savedAt)}</span>
      <span aria-hidden>·</span>
      <button type="button" onClick={refresh} disabled={refreshing} className="inline-flex items-center gap-1.5 font-medium text-primary hover:text-primary-hover disabled:opacity-60">
        {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden />}
        {refreshing ? "Atualizando…" : "Atualizar do Google"}
      </button>
    </div>
  );
}
