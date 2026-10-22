import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, Columns3, Download, FilterX, LayoutList, Loader2, Search, SquareKanban } from "lucide-react";
import { toast } from "sonner";
import { isOverdue } from "@/components/crm/CrmCard";
import { KanbanBoard } from "@/components/crm/KanbanBoard";
import { StatusMenuItems } from "@/components/leads/StatusMenuItems";
import { WhatsAppIcon } from "@/components/stark/BrandIcons";
import { EmptyState } from "@/components/stark/EmptyState";
import { ErrorState } from "@/components/stark/ErrorState";
import { FilterChip } from "@/components/stark/FilterChip";
import { PageHeader } from "@/components/stark/PageHeader";
import { ScoreRing } from "@/components/stark/ScoreRing";
import { Segmented } from "@/components/stark/Segmented";
import { StatusBadge } from "@/components/stark/StatusBadge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { NICHES, getNiche, type NicheKey } from "@/config/niches";
import { STATUSES } from "@/config/status";
import type { CrmQuery } from "@/data/api";
import { useCrmList, useDashboard, useKanban, useSearches } from "@/data/queries";
import { useIsDesktop } from "@/hooks/use-media-query";
import { formatDayMonth, formatNumber, formatRelativeDay } from "@/lib/format";
import { scoreLead } from "@/lib/score";
import { useUI } from "@/store/ui-store";
import { cn } from "@/lib/utils";
import type { Lead, LeadStatus } from "@/types";

const EMPTY_FILTERS: CrmQuery = { status: "todos", city: "todas", niche: "todos", overdueOnly: false, query: "" };
const NEW_PAGE = 50;

const scoreOf = (l: Lead) => scoreLead(l, l.lastService ?? "outro").total;

async function exportView(leads: Lead[], label: string) {
  try {
    const { exportLeadsXlsx } = await import("@/lib/export-xlsx");
    await exportLeadsXlsx(leads, { scores: new Map(leads.map((l) => [l.id, scoreOf(l)])), city: "crm", niche: label });
  } catch (err) {
    console.error("[export]", err);
    toast.error("Não foi possível gerar a planilha agora.");
  }
}

export default function CrmPage() {
  const { openWizard } = useUI();
  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const summaryQ = useDashboard();

  return (
    <div>
      <PageHeader
        title="CRM"
        description={summaryQ.data ? `${formatNumber(summaryQ.data.totalLeads)} leads no seu funil` : "Seu funil de prospecção"}
        actions={
          <Segmented
            label="Visualização do CRM"
            value={view}
            onChange={setView}
            options={[
              { value: "kanban", label: "Kanban", icon: Columns3 },
              { value: "lista", label: "Lista", icon: LayoutList },
            ]}
          />
        }
      />
      {summaryQ.data?.totalLeads === 0 ? (
        <EmptyState
          icon={SquareKanban}
          title="Seu CRM está vazio"
          description="Faça uma busca: os leads encontrados entram aqui como Novo."
          action={
            <Button onClick={() => openWizard()}>
              <Search /> Buscar leads
            </Button>
          }
        />
      ) : view === "kanban" ? (
        <KanbanView />
      ) : (
        <ListView />
      )}
    </div>
  );
}

function KanbanView() {
  const [newLimit, setNewLimit] = useState(NEW_PAGE);
  const kanbanQ = useKanban(newLimit);
  const summaryQ = useDashboard();
  const leads = useMemo(() => kanbanQ.data ?? [], [kanbanQ.data]);
  const scores = useMemo(() => new Map(leads.map((l) => [l.id, scoreOf(l)])), [leads]);

  if (kanbanQ.isLoading) return <KanbanSkeleton />;
  if (kanbanQ.isError) return <ErrorState onRetry={() => void kanbanQ.refetch()} />;
  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button variant="ghost" size="sm" className="h-11 md:h-9" onClick={() => exportView(leads, "kanban")}>
          <Download className="!size-4" /> Exportar .xlsx
        </Button>
      </div>
      <KanbanBoard
        leads={leads}
        scores={scores}
        summary={summaryQ.data}
        onMoreNew={() => setNewLimit((n) => n + NEW_PAGE)}
        loadingMoreNew={kanbanQ.isFetching && !kanbanQ.isLoading}
      />
    </>
  );
}

function ListView() {
  const [filters, setFilters] = useState<CrmQuery>(EMPTY_FILTERS);
  const [query, setQuery] = useState("");
  const summaryQ = useDashboard();
  const searchesQ = useSearches(200);
  const listQ = useCrmList(filters, summaryQ.data?.todayStart);
  const leads = useMemo(() => (listQ.data?.pages ?? []).flat(), [listQ.data]);
  const scores = useMemo(() => new Map(leads.map((l) => [l.id, scoreOf(l)])), [leads]);
  const set = <K extends keyof CrmQuery>(k: K, v: CrmQuery[K]) => setFilters((f) => ({ ...f, [k]: v }));
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  // Busca por nome com pequeno atraso (evita uma consulta por tecla).
  useEffect(() => {
    const t = window.setTimeout(() => setFilters((f) => (f.query === query ? f : { ...f, query })), 350);
    return () => window.clearTimeout(t);
  }, [query]);

  // Opções de cidade e nicho a partir das buscas feitas.
  const cities = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of searchesQ.data ?? []) if (!seen.has(s.cityNormalized)) seen.set(s.cityNormalized, s.city);
    return [...seen.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [searchesQ.data]);
  const niches = useMemo(() => {
    const used = new Set((searchesQ.data ?? []).map((s) => s.niche));
    return NICHES.filter((n) => used.has(n.key));
  }, [searchesQ.data]);

  // Rolagem infinita: carrega a próxima página quando o fim da lista aparece.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !listQ.hasNextPage) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !listQ.isFetchingNextPage) void listQ.fetchNextPage();
    }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [listQ.hasNextPage, listQ.isFetchingNextPage, listQ]);

  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,170px))_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-tertiary" aria-hidden />
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome" aria-label="Buscar por nome" className="pl-10 md:h-9" />
        </div>
        <div className="grid grid-cols-3 gap-2 md:contents">
          <Select value={filters.status} onValueChange={(v) => set("status", v as LeadStatus | "todos")}>
            <SelectTrigger aria-label="Status" className="md:h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.city} onValueChange={(v) => set("city", v)}>
            <SelectTrigger aria-label="Cidade" className="md:h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as cidades</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.niche} onValueChange={(v) => set("niche", v as NicheKey | "todos")}>
            <SelectTrigger aria-label="Nicho" className="md:h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os nichos</SelectItem>
              {niches.map((n) => (
                <SelectItem key={n.key} value={n.key}>
                  {n.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <FilterChip active={filters.overdueOnly} onClick={() => set("overdueOnly", !filters.overdueOnly)} className="justify-self-start">
          <CalendarClock className="h-4 w-4" aria-hidden /> Follow-up atrasado
          {!!summaryQ.data?.followupsOverdue && <span className="rounded-full bg-warning/15 px-1.5 text-xs tabular-nums text-warning">{summaryQ.data.followupsOverdue}</span>}
        </FilterChip>
        <Button variant="ghost" size="sm" className="h-11 justify-self-start md:h-9" onClick={() => exportView(leads, "lista")} disabled={leads.length === 0}>
          <Download className="!size-4" /> Exportar .xlsx
        </Button>
      </div>

      {listQ.isLoading ? (
        <ListSkeleton />
      ) : listQ.isError ? (
        <ErrorState onRetry={() => void listQ.refetch()} />
      ) : leads.length === 0 ? (
        <EmptyState
          icon={FilterX}
          title="Nenhum lead com esses filtros"
          description="Tente remover algum filtro."
          action={
            hasFilters && (
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  setFilters(EMPTY_FILTERS);
                }}
              >
                Limpar filtros
              </Button>
            )
          }
        />
      ) : (
        <>
          <CrmList leads={leads} scores={scores} />
          <div ref={sentinel} className="flex justify-center py-6">
            {listQ.isFetchingNextPage ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Carregando mais" />
            ) : listQ.hasNextPage ? (
              <Button variant="secondary" onClick={() => void listQ.fetchNextPage()}>
                Carregar mais
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">{formatNumber(leads.length)} leads</span>
            )}
          </div>
        </>
      )}
    </>
  );
}

function CrmList({ leads, scores }: { leads: Lead[]; scores: Map<string, number> }) {
  const isDesktop = useIsDesktop();
  const { openLead, openWhatsApp } = useUI();

  if (!isDesktop) {
    return (
      <ul className="grid grid-cols-1 gap-2">
        {leads.map((l) => {
          const overdue = isOverdue(l);
          return (
            <li key={l.id} className="glass relative flex items-center gap-3 p-3">
              <ScoreRing score={scores.get(l.id) ?? 0} size="sm" />
              <div className="min-w-0 flex-1">
                <button type="button" onClick={() => openLead(l.id)} className="block w-full truncate text-left text-sm font-semibold after:absolute after:inset-0 after:content-['']">
                  {l.name}
                </button>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <StatusBadge status={l.status} />
                  {l.followUpAt && (
                    <span className={cn("text-xs", overdue ? "font-medium text-warning" : "text-muted-foreground")}>
                      {overdue ? "Atrasado" : "Follow-up"} {formatRelativeDay(l.followUpAt)}
                    </span>
                  )}
                </div>
              </div>
              <Button variant="secondary" size="icon" className="relative z-10" aria-label={`WhatsApp para ${l.name}`} disabled={l.phoneType === "nenhum"} onClick={() => openWhatsApp(l.id)}>
                <WhatsAppIcon className="text-whatsapp" />
              </Button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="glass overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Empresa</th>
            <th className="px-3 py-3 font-medium">Nicho</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 font-medium">Score</th>
            <th className="px-3 py-3 font-medium">Último contato</th>
            <th className="px-3 py-3 font-medium">Follow-up</th>
            <th className="px-4 py-3 text-right font-medium">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {leads.map((l) => {
            const overdue = isOverdue(l);
            return (
              <tr key={l.id} className="cursor-pointer transition-colors hover:bg-surface-2/50" onClick={() => openLead(l.id)}>
                <td className="max-w-[260px] px-4 py-3">
                  <div className="truncate font-semibold">{l.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{l.city}</div>
                </td>
                <td className="px-3 py-3 text-muted-foreground">{getNiche(l.niche)?.label}</td>
                <td className="px-3 py-3">
                  <StatusBadge status={l.status} />
                </td>
                <td className="px-3 py-3">
                  <ScoreRing score={scores.get(l.id) ?? 0} size="sm" />
                </td>
                <td className="px-3 py-3 tabular-nums text-muted-foreground">{l.lastContactAt ? formatDayMonth(l.lastContactAt) : "—"}</td>
                <td className={cn("px-3 py-3 tabular-nums", overdue ? "font-medium text-warning" : "text-muted-foreground")}>
                  {l.followUpAt ? formatRelativeDay(l.followUpAt) : "—"}
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" aria-label={`WhatsApp para ${l.name}`} disabled={l.phoneType === "nenhum"} onClick={() => openWhatsApp(l.id)}>
                      <WhatsAppIcon className="text-whatsapp" />
                    </Button>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs">
                          Mover para…
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <StatusMenuItems lead={l} label="Mover para" />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function KanbanSkeleton() {
  return (
    <div className="-mx-4 flex gap-3 overflow-hidden px-4 md:-mx-8 md:px-8" aria-busy="true" aria-label="Carregando CRM">
      {Array.from({ length: 4 }, (_, c) => (
        <div key={c} className="w-[84%] max-w-[300px] shrink-0 sm:w-[300px] md:w-[284px]">
          <Skeleton className="mb-3 h-6 w-28" />
          <div className="space-y-2 rounded-lg bg-surface/40 p-2">
            {Array.from({ length: 3 - (c % 2) }, (_, i) => (
              <div key={i} className="glass space-y-2 p-3">
                <div className="flex justify-between gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-2" aria-busy="true">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="glass flex items-center gap-3 p-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
