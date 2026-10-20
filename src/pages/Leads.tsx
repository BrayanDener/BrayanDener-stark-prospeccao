import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpDown, FilterX, LayoutList, Map as MapIcon, MapPin, Search, SearchX, SlidersHorizontal, Store, UsersRound } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
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
import { useSimulatedLoad } from "@/hooks/use-simulated-load";
import { SORT_OPTIONS, applyListFilters, applyServiceFilter, isContacted, sortLeads, type LeadListFilters, type SortKey } from "@/lib/filters";
import { formatNumber, formatRelativeDay } from "@/lib/format";
import { scoreLead } from "@/lib/score";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/app-store";
import { useUI } from "@/store/ui-store";
import type { LeadStatus, Search as SearchType } from "@/types";

const PAGE = 30;

export default function LeadsPage() {
  const [params] = useSearchParams();
  const searchId = params.get("busca");
  const { leads, getSearch, settings } = useApp();
  const { openWizard } = useUI();
  const search = searchId ? getSearch(searchId) : undefined;
  const { status, retry } = useSimulatedLoad(`leads:${searchId ?? "todos"}`);

  const defaultFilters: LeadListFilters = { query: "", status: "todos", noSite: false, mobileOnly: false, hideContacted: settings.hideContacted };
  const [filters, setFilters] = useState<LeadListFilters>(defaultFilters);
  const [sort, setSort] = useState<SortKey>("score");
  const [view, setView] = useState<"lista" | "mapa">("lista");
  const [showRemoved, setShowRemoved] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  // Nova busca → filtros e paginação voltam ao padrão.
  useEffect(() => {
    setFilters({ query: "", status: "todos", noSite: false, mobileOnly: false, hideContacted: settings.hideContacted });
    setShowRemoved(false);
    setLimit(PAGE);
  }, [searchId, settings.hideContacted]);

  const base = useMemo(() => (search ? leads.filter((l) => l.searchId === search.id) : leads), [leads, search]);
  const { qualified } = useMemo(
    () => (search ? applyServiceFilter(base, search.service, { ...settings, ignoreFilter: search.ignoreFilter || showRemoved }) : { qualified: base, removed: 0 }),
    [base, search, settings, showRemoved],
  );
  const removedByFilter = search && !search.ignoreFilter ? applyServiceFilter(base, search.service, settings).removed : 0;
  const scores = useMemo(() => new Map(qualified.map((l) => [l.id, scoreLead(l, l.service, settings).score])), [qualified, settings]);
  const contactedCount = qualified.filter(isContacted).length;
  const visible = useMemo(() => sortLeads(applyListFilters(qualified, filters), sort, (l) => scores.get(l.id) ?? 0), [qualified, filters, sort, scores]);

  const hasActiveFilters = filters.query !== "" || filters.status !== "todos" || filters.noSite || filters.mobileOnly;
  const set = <K extends keyof LeadListFilters>(key: K, value: LeadListFilters[K]) => setFilters((f) => ({ ...f, [key]: value }));

  // Cascata de entrada só na primeira renderização da lista.
  const animatedOnce = useRef(false);
  const animateIn = status === "ready" && !animatedOnce.current;
  useEffect(() => {
    if (status === "ready") animatedOnce.current = true;
  }, [status]);

  if (searchId && !search) {
    return (
      <div className="pt-8">
        <EmptyState
          icon={SearchX}
          title="Busca não encontrada"
          description="Ela pode ter expirado ou o link está incompleto."
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
      {search ? (
        <SearchContext search={search} onEdit={() => openWizard({ initial: search, step: 1 })} />
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

      {/* Resumo */}
      <div className="mb-1 min-h-6 text-sm text-muted-foreground" aria-live="polite">
        {status === "loading" ? (
          <Skeleton className="h-5 w-72 max-w-full" />
        ) : status === "ready" ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              <span className="font-semibold tabular-nums text-foreground">{formatNumber(qualified.length)}</span> {search && !search.ignoreFilter && !showRemoved ? "leads qualificados" : "leads"}
            </span>
            {removedByFilter > 0 && (
              <>
                <span aria-hidden>·</span>
                <span>
                  <span className="tabular-nums">{removedByFilter}</span> {showRemoved ? "fora do filtro (exibidos)" : "removidos pelo filtro"}
                </span>
                <button type="button" onClick={() => setShowRemoved((v) => !v)} className="font-medium text-primary hover:text-primary-hover">
                  {showRemoved ? "Aplicar filtro" : "Mostrar todos"}
                </button>
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
            options={[
              { value: "lista", label: "Lista", icon: LayoutList },
              { value: "mapa", label: "Mapa", icon: MapIcon },
            ]}
            iconOnlyMobile
          />
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

        {status === "error" && <ErrorState description="Não conseguimos carregar os leads desta busca. Seus dados estão seguros." onRetry={retry} />}

        {status === "ready" && view === "mapa" && (
          <div className="glass flex min-h-[360px] flex-col items-center justify-center p-6 text-center">
            <EmptyState
              icon={MapIcon}
              title="Mapa em breve"
              description={`Os ${formatNumber(visible.length)} leads desta lista vão aparecer no mapa em uma próxima etapa.`}
              action={
                <Button variant="secondary" onClick={() => setView("lista")}>
                  <LayoutList /> Voltar para a lista
                </Button>
              }
            />
          </div>
        )}

        {status === "ready" && view === "lista" && (
          <>
            {qualified.length === 0 ? (
              <EmptyState
                icon={search ? FilterX : UsersRound}
                title={search ? "Nenhuma empresa passou no filtro" : "Nenhum lead ainda"}
                description={search ? "Todas as empresas encontradas já atendem o que você oferece. Veja todos os resultados ou mude o serviço." : "Faça sua primeira busca para encontrar empresas."}
                action={
                  search ? (
                    <Button variant="secondary" onClick={() => setShowRemoved(true)}>
                      Mostrar todos os resultados
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
                description={filters.hideContacted && !hasActiveFilters ? "Todos os leads desta busca já foram contatados." : "Tente remover algum filtro."}
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
                    <LeadCard key={lead.id} lead={lead} score={scores.get(lead.id) ?? 0} index={i} animateIn={animateIn} />
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
