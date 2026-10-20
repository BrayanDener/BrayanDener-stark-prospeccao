import { useMemo } from "react";
import { CalendarCheck, Check, Handshake, History, MessageCircleReply, Search, Send, Trophy, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { SearchItem, SearchItemSkeleton } from "@/components/searches/SearchItem";
import { WhatsAppIcon } from "@/components/stark/BrandIcons";
import { EmptyState } from "@/components/stark/EmptyState";
import { ErrorState } from "@/components/stark/ErrorState";
import { MetricCard, MetricCardSkeleton } from "@/components/stark/MetricCard";
import { PageHeader } from "@/components/stark/PageHeader";
import { StatusBadge } from "@/components/stark/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUSES } from "@/config/status";
import { useSimulatedLoad } from "@/hooks/use-simulated-load";
import { isFollowUpOverdue } from "@/lib/filters";
import { formatNumber, formatPercent, formatRelativeDay, greeting } from "@/lib/format";
import { computeMetrics, countByStatus, dueFollowUps } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/app-store";
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
  const { leads, searches, completeFollowUp, setFollowUp } = useApp();
  const { openWizard, openWhatsApp, openLead } = useUI();
  const { status, retry } = useSimulatedLoad("dashboard");

  const crm = useMemo(() => leads.filter((l) => l.inCrm), [leads]);
  const metrics = useMemo(() => computeMetrics(crm), [crm]);
  const funnel = useMemo(() => countByStatus(crm), [crm]);
  const followUps = useMemo(() => dueFollowUps(crm), [crm]);
  const recent = useMemo(() => [...searches].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5), [searches]);
  const maxFunnel = Math.max(1, ...Object.values(funnel));
  const overdue = followUps.filter((l) => isFollowUpOverdue(l)).length;

  const subtitle =
    status !== "ready"
      ? "Carregando seu dia…"
      : followUps.length === 0
        ? "Nenhum follow-up pendente hoje. Bom momento para uma nova busca."
        : `Você tem ${followUps.length} follow-up${followUps.length > 1 ? "s" : ""} para hoje${overdue ? `, ${overdue} atrasado${overdue > 1 ? "s" : ""}` : ""}.`;

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

      {status === "error" ? (
        <ErrorState onRetry={retry} />
      ) : (
        <div className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {status === "loading" ? (
              Array.from({ length: 5 }, (_, i) => <MetricCardSkeleton key={i} className={cn(i === 4 && "col-span-2 lg:col-span-1")} />)
            ) : (
              <>
                <MetricCard label="Total de leads" value={formatNumber(metrics.total)} icon={UsersRound} hint="no seu CRM" />
                <MetricCard label="Contatados" value={formatNumber(metrics.contacted)} icon={Send} hint="já receberam mensagem" />
                <MetricCard label="Em negociação" value={formatNumber(metrics.negotiating)} icon={Handshake} hint="propostas em aberto" />
                <MetricCard label="Fechados" value={formatNumber(metrics.closed)} icon={Trophy} hint="clientes conquistados" accent />
                <MetricCard
                  label="Taxa de resposta"
                  value={formatPercent(metrics.responseRate)}
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
              aside={status === "ready" && followUps.length > 0 && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">{followUps.length}</span>}
            >
              {status === "loading" ? (
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
              ) : followUps.length === 0 ? (
                <EmptyState icon={CalendarCheck} title="Tudo em dia" description="Nenhum follow-up para hoje." className="py-8" />
              ) : (
                <ul className="-mx-2 divide-y divide-border">
                  {followUps.map((l) => {
                    const late = isFollowUpOverdue(l);
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
                              {late ? `Atrasado · ${formatRelativeDay(l.nextFollowUpAt!)}` : "Hoje"}
                            </span>
                          </div>
                        </div>
                        <Button variant="secondary" size="icon" aria-label={`WhatsApp para ${l.name}`} disabled={!l.phone} onClick={() => openWhatsApp(l.id)}>
                          <WhatsAppIcon className="text-whatsapp" />
                        </Button>
                        <Button
                          variant="secondary"
                          className="px-3"
                          onClick={() => {
                            const prev = l.nextFollowUpAt;
                            completeFollowUp(l.id);
                            toast.success("Follow-up concluído", {
                              description: l.name,
                              action: { label: "Desfazer", onClick: () => setFollowUp(l.id, prev) },
                            });
                          }}
                        >
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
                {status === "loading" ? (
                  <ul className="-mx-2">
                    {Array.from({ length: 3 }, (_, i) => (
                      <SearchItemSkeleton key={i} />
                    ))}
                  </ul>
                ) : recent.length === 0 ? (
                  <EmptyState icon={Search} title="Nenhuma busca ainda" action={<Button onClick={() => openWizard()}>Fazer a primeira busca</Button>} className="py-8" />
                ) : (
                  <ul className="-mx-2">
                    {recent.map((s) => (
                      <SearchItem key={s.id} search={s} />
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel title="Funil" icon={UsersRound}>
                <ul className="space-y-3">
                  {STATUSES.map((s) => (
                    <li key={s.key} className="grid grid-cols-[96px_minmax(0,1fr)_32px] items-center gap-3 text-sm">
                      <span className="truncate text-muted-foreground">{s.label}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-surface-2">
                        {status === "ready" && (
                          <span
                            className={cn("block h-full rounded-full transition-[width] duration-700 ease-out", s.bar)}
                            style={{ width: `${(funnel[s.key] / maxFunnel) * 100}%` }}
                          />
                        )}
                      </span>
                      <span className="text-right font-semibold tabular-nums">{status === "ready" ? funnel[s.key] : "–"}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
