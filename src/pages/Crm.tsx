import { useMemo, useState } from "react";
import { CalendarClock, Columns3, FilterX, LayoutList, Search, SquareKanban } from "lucide-react";
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
import { getNiche, type NicheKey } from "@/config/niches";
import { STATUSES } from "@/config/status";
import { useIsDesktop } from "@/hooks/use-media-query";
import { useSimulatedLoad } from "@/hooks/use-simulated-load";
import { applyCrmFilters, isFollowUpOverdue, type CrmFilters } from "@/lib/filters";
import { formatDayMonth, formatRelativeDay } from "@/lib/format";
import { scoreLead } from "@/lib/score";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/app-store";
import { useUI } from "@/store/ui-store";
import type { Lead, LeadStatus } from "@/types";

const EMPTY_FILTERS: CrmFilters = { status: "todos", city: "todas", niche: "todos", overdueOnly: false, query: "" };

export default function CrmPage() {
  const { leads, settings } = useApp();
  const { openWizard } = useUI();
  const { status, retry } = useSimulatedLoad("crm");
  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [filters, setFilters] = useState<CrmFilters>(EMPTY_FILTERS);

  const crmLeads = useMemo(() => leads.filter((l) => l.inCrm), [leads]);
  const scores = useMemo(() => new Map(crmLeads.map((l) => [l.id, scoreLead(l, l.service, settings).score])), [crmLeads, settings]);
  const cities = useMemo(() => [...new Set(crmLeads.map((l) => l.city))].sort((a, b) => a.localeCompare(b, "pt-BR")), [crmLeads]);
  const niches = useMemo(() => [...new Set(crmLeads.map((l) => l.niche))], [crmLeads]);
  const overdueCount = crmLeads.filter((l) => isFollowUpOverdue(l)).length;
  const filtered = useMemo(
    () =>
      applyCrmFilters(crmLeads, filters).sort(
        (a, b) => (b.lastContactAt ?? b.createdAt).localeCompare(a.lastContactAt ?? a.createdAt),
      ),
    [crmLeads, filters],
  );
  const set = <K extends keyof CrmFilters>(k: K, v: CrmFilters[K]) => setFilters((f) => ({ ...f, [k]: v }));
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  return (
    <div>
      <PageHeader
        title="CRM"
        description={status === "ready" ? `${crmLeads.length} leads no seu funil` : "Seu funil de prospecção"}
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

      {status === "loading" && (view === "kanban" ? <KanbanSkeleton /> : <ListSkeleton />)}
      {status === "error" && <ErrorState onRetry={retry} />}

      {status === "ready" && crmLeads.length === 0 && (
        <EmptyState
          icon={SquareKanban}
          title="Seu CRM está vazio"
          description="Leads entram aqui quando você muda o status, anota algo ou adiciona ao CRM."
          action={
            <Button onClick={() => openWizard()}>
              <Search /> Buscar leads
            </Button>
          }
        />
      )}

      {status === "ready" && crmLeads.length > 0 && view === "kanban" && <KanbanBoard leads={crmLeads} scores={scores} />}

      {status === "ready" && crmLeads.length > 0 && view === "lista" && (
        <>
          <div className="mb-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,170px))_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-tertiary" aria-hidden />
              <Input type="search" value={filters.query} onChange={(e) => set("query", e.target.value)} placeholder="Buscar por nome" aria-label="Buscar por nome" className="pl-10 md:h-9" />
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
                    <SelectItem key={n} value={n}>
                      {getNiche(n)?.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FilterChip active={filters.overdueOnly} onClick={() => set("overdueOnly", !filters.overdueOnly)} className="justify-self-start">
              <CalendarClock className="h-4 w-4" aria-hidden /> Follow-up atrasado
              {overdueCount > 0 && <span className="rounded-full bg-warning/15 px-1.5 text-xs tabular-nums text-warning">{overdueCount}</span>}
            </FilterChip>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={FilterX}
              title="Nenhum lead com esses filtros"
              description="Tente remover algum filtro."
              action={
                hasFilters && (
                  <Button variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
                    Limpar filtros
                  </Button>
                )
              }
            />
          ) : (
            <CrmList leads={filtered} scores={scores} />
          )}
        </>
      )}
    </div>
  );
}

function CrmList({ leads, scores }: { leads: Lead[]; scores: Map<string, number> }) {
  const isDesktop = useIsDesktop();
  const { openLead, openWhatsApp } = useUI();

  if (!isDesktop) {
    return (
      <ul className="grid grid-cols-1 gap-2">
        {leads.map((l) => {
          const overdue = isFollowUpOverdue(l);
          return (
            <li key={l.id} className="glass relative flex items-center gap-3 p-3">
              <ScoreRing score={scores.get(l.id) ?? 0} size="sm" />
              <div className="min-w-0 flex-1">
                <button type="button" onClick={() => openLead(l.id)} className="block w-full truncate text-left text-sm font-semibold after:absolute after:inset-0 after:content-['']">
                  {l.name}
                </button>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <StatusBadge status={l.status} />
                  {l.nextFollowUpAt && (
                    <span className={cn("text-xs", overdue ? "font-medium text-warning" : "text-muted-foreground")}>
                      {overdue ? "Atrasado" : "Follow-up"} {formatRelativeDay(l.nextFollowUpAt)}
                    </span>
                  )}
                </div>
              </div>
              <Button variant="secondary" size="icon" className="relative z-10" aria-label={`WhatsApp para ${l.name}`} disabled={!l.phone} onClick={() => openWhatsApp(l.id)}>
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
            const overdue = isFollowUpOverdue(l);
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
                  {l.nextFollowUpAt ? formatRelativeDay(l.nextFollowUpAt) : "—"}
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" aria-label={`WhatsApp para ${l.name}`} disabled={!l.phone} onClick={() => openWhatsApp(l.id)}>
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
