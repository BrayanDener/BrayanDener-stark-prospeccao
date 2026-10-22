import { CalendarCheck, Check, Handshake, History, MessageCircleReply, Search, Send, Trophy, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { CrmFunnel } from "@/components/crm/CrmFunnel";
import { SearchItem, SearchItemSkeleton } from "@/components/searches/SearchItem";
import { WhatsAppIcon } from "@/components/stark/BrandIcons";
import { EmptyState } from "@/components/stark/EmptyState";
import { ErrorState } from "@/components/stark/ErrorState";
import { MetricCard, MetricCardSkeleton } from "@/components/stark/MetricCard";
import { PageHeader } from "@/components/stark/PageHeader";
import { StatusBadge } from "@/components/stark/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompleteFollowUp, useDashboard, useDueFollowups, useSearches } from "@/data/queries";
import { formatNumber, formatPercent, formatRelativeDay, greeting } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useUI } from "@/store/ui-store";

function Panel({ title, icon: Icon, aside, children, className }: { title: string; icon: typeof Search; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("glass min-w-0 p-4 md:p-5", className)}>
      <header className="mb-3 flex items-center gap-2">
        <Icon className="h-[18px] w-[18px] text-tertiary" aria-hidden />
        <h2 className="font-display text-base font-semibold">{title}</h2>
        <div className="ml-auto">{aside}</div>
      </header>
      {children}
    </section>
  );
}

export default function DashboardPage() {
  const { openWizard, openWhatsApp, openLead } = useUI();
  const summaryQ = useDashboard();
  const dueQ = useDueFollowups();
  const recentQ = useSearches(5);
  const complete = useCompleteFollowUp();
  const s = summaryQ.data;
  const due = dueQ.data ?? [];
  const todayStart = s ? new Date(s.todayStart) : null;
  const isLate = (iso: string | null) => !!iso && !!todayStart && new Date(iso) < todayStart;

  const subtitle = !s
    ? "Carregando seu dia…"
    : s.followupsDue === 0
      ? "Nenhum follow-up pendente hoje. Bom momento para uma nova busca."
      : `Você tem ${s.followupsDue} follow-up${s.followupsDue > 1 ? "s" : ""} para hoje${s.followupsOverdue ? `, ${s.followupsOverdue} atrasado${s.followupsOverdue > 1 ? "s" : ""}` : ""}.`;

  return (
    <div>
      <PageHeader
        title={`${greeting()}.`}
        description={subtitle}
        actions={
          <Button onClick={() => openWizard()} className="w-full md:w-auto">
            <Search /> Nova busca
          </Button>
        }
      />

      {summaryQ.isError ? (
        <ErrorState onRetry={() => void summaryQ.refetch()} />
      ) : (
        <div className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {!s ? (
              Array.from({ length: 5 }, (_, i) => <MetricCardSkeleton key={i} className={cn(i === 4 && "col-span-2 lg:col-span-1")} />)
            ) : (
              <>
                <MetricCard label="Total de leads" value={formatNumber(s.totalLeads)} icon={UsersRound} hint="encontrados nas buscas" />
                <MetricCard label="Contatados" value={formatNumber(s.contacted)} icon={Send} hint="já receberam contato" />
                <MetricCard label="Em negociação" value={formatNumber(s.negotiating)} icon={Handshake} hint="propostas em aberto" />
                <MetricCard label="Fechados" value={formatNumber(s.closed)} icon={Trophy} hint={`${formatNumber(s.closedThisMonth)} este mês`} accent />
                <MetricCard
                  label="Taxa de resposta"
                  value={s.contacted === 0 ? "—" : formatPercent(s.replied / s.contacted)}
                  icon={MessageCircleReply}
                  hint="responderam ÷ contatados"
                  className="col-span-2 lg:col-span-1"
                />
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Panel
              title="Follow-ups de hoje"
              icon={CalendarCheck}
              aside={due.length > 0 && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">{due.length}</span>}
            >
              {dueQ.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                      <Skeleton className="h-11 w-11" />
                      <Skeleton className="h-11 w-24" />
                    </div>
                  ))}
                </div>
              ) : dueQ.isError ? (
                <ErrorState description="Não conseguimos carregar os follow-ups." onRetry={() => void dueQ.refetch()} className="py-8" />
              ) : due.length === 0 ? (
                <EmptyState icon={CalendarCheck} title="Tudo em dia" description="Nenhum follow-up para hoje." className="py-8" />
              ) : (
                <ul className="-mx-2 divide-y divide-border">
                  {due.map((l) => {
                    const late = isLate(l.followUpAt);
                    return (
                      <li key={l.id} className={cn("relative flex items-center gap-3 rounded-md px-2 py-3", late && "bg-warning/[0.06]")}>
                        {late && <span aria-hidden className="absolute bottom-3 left-0 top-3 w-[2px] rounded-full bg-warning" />}
                        <div className="min-w-0 flex-1">
                          <button type="button" onClick={() => openLead(l.id)} className="block w-full truncate text-left text-sm font-semibold hover:text-primary-hover">
                            {l.name}
                          </button>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <StatusBadge status={l.status} />
                            <span className={cn("text-xs", late ? "font-medium text-warning" : "text-muted-foreground")}>
                              {late ? `Atrasado · ${formatRelativeDay(l.followUpAt!)}` : "Hoje"}
                            </span>
                          </div>
                        </div>
                        <Button variant="secondary" size="icon" aria-label={`WhatsApp para ${l.name}`} disabled={l.phoneType === "nenhum"} onClick={() => openWhatsApp(l.id)}>
                          <WhatsAppIcon className="text-whatsapp" />
                        </Button>
                        <Button variant="secondary" className="px-3" onClick={() => complete.mutate(l)}>
                          <Check /> <span className="hidden sm:inline">Concluir</span>
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <div className="min-w-0 space-y-4 md:space-y-6">
              <Panel
                title="Últimas buscas"
                icon={History}
                aside={
                  <Link to="/historico" className="text-sm font-medium text-primary hover:text-primary-hover">
                    Ver todas
                  </Link>
                }
              >
                {recentQ.isLoading ? (
                  <ul className="-mx-2">
                    {Array.from({ length: 3 }, (_, i) => (
                      <SearchItemSkeleton key={i} />
                    ))}
                  </ul>
                ) : recentQ.isError ? (
                  <ErrorState description="Não conseguimos carregar as buscas." onRetry={() => void recentQ.refetch()} className="py-6" />
                ) : (recentQ.data ?? []).length === 0 ? (
                  <EmptyState icon={Search} title="Nenhuma busca ainda" action={<Button onClick={() => openWizard()}>Fazer a primeira busca</Button>} className="py-8" />
                ) : (
                  <ul className="-mx-2">
                    {(recentQ.data ?? []).map((search) => (
                      <SearchItem key={search.id} search={search} />
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel title="Funil" icon={UsersRound}>
                <CrmFunnel funnel={s?.funnel} />
              </Panel>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
