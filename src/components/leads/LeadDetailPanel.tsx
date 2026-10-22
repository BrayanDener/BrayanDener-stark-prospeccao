import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRightLeft, CalendarCheck, CalendarClock, Check, Clock, FileText, Globe, Instagram, Loader2, MapPin, Minus, Phone, Search, type LucideIcon,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { WhatsAppIcon } from "@/components/stark/BrandIcons";
import { LeadTag, LeadTags } from "@/components/stark/LeadTag";
import { ResponsivePanel } from "@/components/stark/ResponsivePanel";
import { ScoreRing } from "@/components/stark/ScoreRing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getNiche } from "@/config/niches";
import { getService } from "@/config/services";
import { STATUSES } from "@/config/status";
import { useActivities, useCompleteFollowUp, useLead, useSearch, useSetFollowUp, useSetStatus, useUpdateNotes } from "@/data/queries";
import { addDays, formatDate, formatDateTime, formatRelativeDay, fromDateInputValue, startOfDay, toDateInputValue } from "@/lib/format";
import { isOpenAt, weekLines } from "@/lib/hours";
import { displayUrl, instagramProfileUrl, instagramUrl, mapsUrl } from "@/lib/links";
import { formatPhone } from "@/lib/phone";
import { scoreLead } from "@/lib/score";
import { cn } from "@/lib/utils";
import { useUI } from "@/store/ui-store";
import type { ActivityType, Lead, LeadStatus, ServiceKey } from "@/types";
import { LeadActions } from "./LeadActions";

const ACTIVITY_ICON: Record<ActivityType | "busca", LucideIcon | "whatsapp"> = {
  busca: Search,
  status: ArrowRightLeft,
  whatsapp: "whatsapp",
  ligacao: Phone,
  nota: FileText,
  followup: CalendarClock,
};

function Section({ title, children, aside, id }: { title: string; children: React.ReactNode; aside?: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="border-t border-border py-5 first:border-t-0 first:pt-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function InfoRow({ icon: Icon, children, href }: { icon: LucideIcon; children: React.ReactNode; href?: string | null }) {
  const content = (
    <>
      <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-tertiary" aria-hidden />
      <div className="min-w-0 flex-1 text-sm">{children}</div>
    </>
  );
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="-mx-2 flex min-h-11 items-start gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-surface-2">
      {content}
    </a>
  ) : (
    <div className="flex min-h-11 items-start gap-3 py-2.5">{content}</div>
  );
}

/** Serviço usado no score: o da busca aberta na tela, senão o da última busca que achou o lead. */
function useScoreService(lead: Lead | null | undefined): ServiceKey {
  const [params] = useSearchParams();
  const { data: search } = useSearch(params.get("busca"));
  return search?.service ?? lead?.lastService ?? "outro";
}

export function LeadDetailPanel() {
  const { leadDetail, closeLead } = useUI();
  const { data: lead, isLoading } = useLead(leadDetail.id);
  const service = useScoreService(lead);
  // Mantém o último lead durante a animação de fechamento.
  const lastLead = useRef<Lead | null | undefined>(lead);
  if (lead) lastLead.current = lead;
  const shown = lead ?? lastLead.current;
  const open = !!leadDetail.id;

  return (
    <ResponsivePanel
      open={open}
      onOpenChange={(o) => !o && closeLead()}
      title={shown?.name ?? (isLoading ? "Carregando…" : "Lead")}
      description={shown ? `${getNiche(shown.niche)?.label ?? ""} · ${shown.city}` : undefined}
      headerAside={shown ? <ScoreRing score={scoreLead(shown, service).total} size="lg" className="md:mr-8" /> : null}
      footer={shown ? <LeadActions lead={shown} withMenu={false} /> : null}
    >
      {shown ? (
        <LeadDetailBody key={shown.id} lead={shown} service={service} focusNotes={leadDetail.focusNotes} />
      ) : isLoading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">Não encontramos esse lead. Ele pode ter sido removido.</p>
      )}
    </ResponsivePanel>
  );
}

function LeadDetailBody({ lead, service, focusNotes }: { lead: Lead; service: ServiceKey; focusNotes: boolean }) {
  const result = useMemo(() => scoreLead(lead, service), [lead, service]);
  const open = isOpenAt(lead.openingHours);
  const insta = instagramProfileUrl(lead);
  const lines = weekLines(lead.openingHours);

  return (
    <div>
      <Section title="Dados">
        <LeadTags lead={lead} className="mb-3" />
        <div className="divide-y divide-border">
          <InfoRow icon={Phone}>
            {lead.phoneType !== "nenhum" ? (
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium tabular-nums">{formatPhone(lead.phoneE164 ?? lead.phoneNational)}</span>
                <span className="text-muted-foreground">{lead.phoneType === "celular" ? "Celular" : "Fixo"}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">Sem telefone no Google</span>
            )}
          </InfoRow>
          <InfoRow icon={MapPin} href={mapsUrl(lead)}>
            <span className="block font-medium">{lead.address ?? lead.city}</span>
            <span className="block text-primary">Abrir no Google Maps</span>
          </InfoRow>
          <InfoRow icon={Globe} href={lead.website}>
            {lead.website ? (
              <>
                <span className="block truncate font-medium text-primary">{displayUrl(lead.website)}</span>
                {lead.websiteKind === "rede_social" && <span className="block text-muted-foreground">Rede social ou plataforma, não é site próprio</span>}
              </>
            ) : (
              <span className="text-muted-foreground">Sem site no Google</span>
            )}
          </InfoRow>
          <InfoRow icon={Instagram} href={instagramUrl(lead)}>
            {insta ? <span className="font-medium text-primary">{displayUrl(insta)}</span> : <span className="text-primary">Procurar o Instagram no Google</span>}
          </InfoRow>
        </div>
      </Section>

      <Section
        title="Horário de funcionamento"
        aside={
          open === null ? null : (
            <LeadTag tone={open ? "success" : "neutral"} dot={open}>
              {open ? "Aberto agora" : "Fechado agora"}
            </LeadTag>
          )
        }
      >
        {lines.length > 0 ? (
          <ul className="space-y-0.5">
            {lines.map((l) => (
              <li key={l.label} className={cn("flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm", l.today ? "bg-surface-2 text-foreground" : "text-muted-foreground")}>
                <span className={cn("shrink-0", l.today && "font-semibold")}>
                  {l.label}
                  {l.today && <span className="ml-2 text-xs font-medium text-primary">Hoje</span>}
                </span>
                <span className="text-right tabular-nums">{l.value}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" aria-hidden /> Horário não informado no Google.
          </p>
        )}
      </Section>

      <Section title="Por que esse score?" aside={<span className="text-xs text-muted-foreground">Para {getService(service).label}</span>}>
        <ul className="space-y-1">
          {result.criterios.map((c) => {
            const full = c.pontos === c.max && c.max > 0;
            return (
              <li key={c.label} className="flex items-center gap-3 py-1.5 text-sm">
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                    full ? "bg-success/15 text-success" : c.pontos > 0 ? "bg-primary/15 text-primary" : "bg-surface-2 text-tertiary",
                  )}
                  aria-hidden
                >
                  {c.pontos > 0 ? <Check className="h-3 w-3" strokeWidth={3} /> : <Minus className="h-3 w-3" />}
                </span>
                <span className={cn("flex-1", c.pontos > 0 ? "text-foreground" : "text-muted-foreground")}>{c.label}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  <span className={cn("font-semibold", c.pontos > 0 && "text-foreground")}>+{c.pontos}</span>/{c.max}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="font-display text-base font-bold tabular-nums">{result.total} / 100</span>
        </div>
      </Section>

      <FollowSection lead={lead} />
      <NotesSection lead={lead} focus={focusNotes} />
      <ActivitySection lead={lead} />
    </div>
  );
}

function FollowSection({ lead }: { lead: Lead }) {
  const setStatus = useSetStatus();
  const setFollowUp = useSetFollowUp();
  const complete = useCompleteFollowUp();
  const [custom, setCustom] = useState(false);
  const overdue = !!lead.followUpAt && new Date(lead.followUpAt) < startOfDay(new Date());

  const pick = (days: number) => {
    const d = addDays(new Date(), days);
    d.setHours(9, 0, 0, 0);
    setCustom(false);
    setFollowUp.mutate({ lead, at: d.toISOString() });
  };

  return (
    <Section title="Acompanhamento">
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="detail-status">Status</Label>
          <Select value={lead.status} onValueChange={(v) => v !== lead.status && setStatus.mutate({ lead, status: v as LeadStatus })}>
            <SelectTrigger id="detail-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  <span className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", s.dot)} aria-hidden />
                    {s.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Último contato</span>
          <span className="text-right font-medium">{lead.lastContactAt ? `${formatDate(lead.lastContactAt)} (${formatRelativeDay(lead.lastContactAt)})` : "Ainda não contatado"}</span>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Próximo follow-up</span>
            <span className={cn("text-right text-sm", overdue ? "font-medium text-warning" : "text-muted-foreground")}>
              {lead.followUpAt ? `${overdue ? "Atrasado · " : ""}${formatDate(lead.followUpAt)} (${formatRelativeDay(lead.followUpAt)})` : "Sem data"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { d: 1, l: "Amanhã" },
              { d: 3, l: "3 dias" },
              { d: 7, l: "1 semana" },
            ].map((o) => (
              <Button key={o.d} variant="outline" size="sm" className="h-11 md:h-9" onClick={() => pick(o.d)}>
                {o.l}
              </Button>
            ))}
            <Button variant={custom ? "soft" : "outline"} size="sm" className="h-11 md:h-9" onClick={() => setCustom((v) => !v)}>
              Personalizado
            </Button>
            {lead.followUpAt && (
              <Button variant="ghost" size="sm" className="h-11 md:h-9" onClick={() => setFollowUp.mutate({ lead, at: null })}>
                Limpar
              </Button>
            )}
          </div>
          {custom && (
            <Input
              type="date"
              aria-label="Data do follow-up"
              defaultValue={toDateInputValue(lead.followUpAt)}
              min={toDateInputValue(new Date().toISOString())}
              onChange={(e) => {
                const at = fromDateInputValue(e.target.value);
                if (at) setFollowUp.mutate({ lead, at });
              }}
              className="tabular-nums"
            />
          )}
          {lead.followUpAt && (
            <Button variant="secondary" className="justify-self-start" onClick={() => complete.mutate(lead)} disabled={complete.isPending}>
              <CalendarCheck /> Concluir follow-up
            </Button>
          )}
        </div>
      </div>
    </Section>
  );
}

type SaveState = "idle" | "saving" | "saved";

function NotesSection({ lead, focus }: { lead: Lead; focus: boolean }) {
  const updateNotes = useUpdateNotes();
  const [text, setText] = useState(lead.notes);
  const [state, setState] = useState<SaveState>("idle");
  const saved = useRef(lead.notes);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Salvamento automático: 800ms depois de parar de digitar.
  useEffect(() => {
    if (text === saved.current) return;
    setState("saving");
    const t = window.setTimeout(() => {
      updateNotes.mutate(
        { leadId: lead.id, notes: text },
        {
          onSuccess: () => {
            saved.current = text;
            setState("saved");
          },
          onError: () => setState("idle"),
        },
      );
    }, 800);
    return () => window.clearTimeout(t);
  }, [text, lead.id]);

  useEffect(() => {
    if (!focus) return;
    const t = window.setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      ref.current?.focus({ preventScroll: true });
    }, 350);
    return () => window.clearTimeout(t);
  }, [focus]);

  return (
    <Section
      title="Anotações"
      id="anotacoes"
      aside={
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
          {state === "saving" && (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Salvando…
            </>
          )}
          {state === "saved" && (
            <>
              <Check className="h-3.5 w-3.5 text-success" aria-hidden /> Salvo
            </>
          )}
        </span>
      }
    >
      <Label htmlFor="detail-notes" className="sr-only">
        Anotações
      </Label>
      <Textarea
        id="detail-notes"
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ex.: falar com o dono depois das 18h. Salva sozinho."
        rows={4}
      />
    </Section>
  );
}

function ActivitySection({ lead }: { lead: Lead }) {
  const { data, isLoading, isError, refetch } = useActivities(lead.id);
  const items = [
    ...(data ?? []).map((a) => ({ id: a.id, type: a.type as ActivityType | "busca", text: a.description, at: a.createdAt })),
    { id: "found", type: "busca" as const, text: "Encontrado na busca do Google", at: lead.firstSeenAt },
  ];

  return (
    <Section title="Histórico de atividades">
      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm text-muted-foreground">
          Não foi possível carregar o histórico.
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : (
        <ol className="relative space-y-4 pl-1">
          {items.map((a, i) => {
            const Icon = ACTIVITY_ICON[a.type] ?? FileText;
            return (
              <li key={a.id} className="relative flex gap-3">
                {i < items.length - 1 && <span aria-hidden className="absolute left-[15px] top-8 h-[calc(100%-8px)] w-px bg-border" />}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-muted-foreground">
                  {Icon === "whatsapp" ? <WhatsAppIcon className="h-4 w-4 text-whatsapp" /> : <Icon className="h-4 w-4" aria-hidden />}
                </span>
                <div className="min-w-0 pt-1">
                  <p className={cn("text-sm", a.type === "whatsapp" && "line-clamp-3 whitespace-pre-line text-muted-foreground")}>
                    {a.type === "whatsapp" ? `WhatsApp: ${a.text}` : a.text}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(a.at)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Section>
  );
}
