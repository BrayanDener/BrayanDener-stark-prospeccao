import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRightLeft, CalendarClock, Check, Clock, FileText, Globe, Instagram, MapPin, Minus, Phone, PlusCircle, Search, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { WhatsAppIcon } from "@/components/stark/BrandIcons";
import { LeadTag, LeadTags } from "@/components/stark/LeadTag";
import { ResponsivePanel } from "@/components/stark/ResponsivePanel";
import { ScoreRing } from "@/components/stark/ScoreRing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getNiche } from "@/config/niches";
import { getService } from "@/config/services";
import { STATUSES, getStatus } from "@/config/status";
import { getWebPresence, isFollowUpOverdue } from "@/lib/filters";
import { addDays, formatDate, formatDateTime, formatRelativeDay, fromDateInputValue, toDateInputValue } from "@/lib/format";
import { WEEKDAYS, WEEK_ORDER, hoursForDay, isOpenAt } from "@/lib/hours";
import { formatPhone, phoneKind } from "@/lib/phone";
import { scoreLead } from "@/lib/score";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/app-store";
import { useUI } from "@/store/ui-store";
import type { ActivityType, Lead, LeadStatus } from "@/types";
import { instagramHandle, instagramUrl, mapsUrl, ownSiteUrl } from "./lead-links";
import { LeadActions } from "./LeadActions";

const ACTIVITY_ICON: Record<ActivityType, LucideIcon | "whatsapp"> = {
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

export function LeadDetailPanel() {
  const { leadDetail, closeLead } = useUI();
  const { getLead } = useApp();
  const lead = leadDetail.id ? getLead(leadDetail.id) : undefined;
  // Mantém o último lead durante a animação de fechamento.
  const lastLead = useRef<Lead | undefined>(lead);
  if (lead) lastLead.current = lead;
  const shown = lead ?? lastLead.current;

  return (
    <ResponsivePanel
      open={!!lead}
      onOpenChange={(o) => !o && closeLead()}
      title={shown?.name ?? ""}
      description={shown ? `${getNiche(shown.niche)?.label ?? ""} · ${shown.city}` : undefined}
      headerAside={shown ? <DetailScore lead={shown} /> : null}
      footer={shown ? <LeadActions lead={shown} withMenu={false} /> : null}
    >
      {shown && <LeadDetailBody key={shown.id} lead={shown} focusNotes={leadDetail.focusNotes} />}
    </ResponsivePanel>
  );
}

function DetailScore({ lead }: { lead: Lead }) {
  const { settings } = useApp();
  const { score } = scoreLead(lead, lead.service, settings);
  return <ScoreRing score={score} size="lg" className="md:mr-8" />;
}

function LeadDetailBody({ lead, focusNotes }: { lead: Lead; focusNotes: boolean }) {
  const { settings, updateStatus, setFollowUp, addNote, addToCrm } = useApp();
  const [note, setNote] = useState("");
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const result = useMemo(() => scoreLead(lead, lead.service, settings), [lead, settings]);
  const presence = getWebPresence(lead);
  const kind = phoneKind(lead.phone);
  const site = ownSiteUrl(lead);
  const insta = instagramHandle(lead);
  const today = new Date().getDay();
  const openNow = isOpenAt(lead.hours);
  const overdue = isFollowUpOverdue(lead);

  useEffect(() => {
    if (!focusNotes) return;
    const t = window.setTimeout(() => {
      notesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      notesRef.current?.focus({ preventScroll: true });
    }, 350);
    return () => window.clearTimeout(t);
  }, [focusNotes]);

  const saveNote = () => {
    const text = note.trim();
    if (!text) return;
    addNote(lead.id, text);
    setNote("");
    toast.success("Anotação salva");
  };

  const quickFollowUp = (days: number) => {
    const d = addDays(new Date(), days);
    d.setHours(9, 0, 0, 0);
    setFollowUp(lead.id, d.toISOString());
    toast.success("Follow-up agendado", { description: formatDate(d.toISOString()) });
  };

  return (
    <div>
      {!lead.inCrm && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary-muted p-3">
          <p className="text-sm">Este lead ainda não está no seu CRM.</p>
          <Button
            size="sm"
            onClick={() => {
              addToCrm(lead.id);
              toast.success("Adicionado ao CRM");
            }}
          >
            <PlusCircle /> Adicionar
          </Button>
        </div>
      )}

      <Section title="Dados">
        <LeadTags lead={lead} className="mb-3" />
        <div className="divide-y divide-border">
          <InfoRow icon={Phone}>
            {lead.phone ? (
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium tabular-nums">{formatPhone(lead.phone)}</span>
                <span className="text-muted-foreground">{kind === "celular" ? "Celular" : "Fixo"}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">Sem telefone no Google</span>
            )}
          </InfoRow>
          <InfoRow icon={MapPin} href={mapsUrl(lead)}>
            <span className="block font-medium">{lead.address}</span>
            <span className="block text-muted-foreground">
              {lead.neighborhood} · {lead.city} - {lead.state}
            </span>
          </InfoRow>
          <InfoRow icon={Globe} href={site}>
            {site ? (
              <span className="block truncate font-medium text-primary">{site.replace(/^https?:\/\/(www\.)?/, "")}</span>
            ) : (
              <span className="text-muted-foreground">{presence === "social" ? "Sem site próprio (usa só rede social)" : "Sem site"}</span>
            )}
          </InfoRow>
          <InfoRow icon={Instagram} href={instagramUrl(lead)}>
            {insta ? <span className="font-medium text-primary">{insta}</span> : <span className="text-muted-foreground">Instagram não encontrado</span>}
          </InfoRow>
        </div>
      </Section>

      <Section
        title="Horário de funcionamento"
        aside={openNow === null ? null : <LeadTag tone={openNow ? "success" : "neutral"} dot={openNow}>{openNow ? "Aberto agora" : "Fechado agora"}</LeadTag>}
      >
        {lead.hours ? (
          <ul className="space-y-0.5">
            {WEEK_ORDER.map((day) => {
              const isToday = day === today;
              return (
                <li key={day} className={cn("flex items-center justify-between rounded-md px-2 py-1.5 text-sm", isToday ? "bg-surface-2 text-foreground" : "text-muted-foreground")}>
                  <span className={cn(isToday && "font-semibold")}>
                    {WEEKDAYS[day]}
                    {isToday && <span className="ml-2 text-xs font-medium text-primary">Hoje</span>}
                  </span>
                  <span className="tabular-nums">{hoursForDay(lead.hours, day)}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" aria-hidden /> Horário não informado no Google.
          </p>
        )}
      </Section>

      <Section title="Por que esse score?" aside={<span className="text-xs text-muted-foreground">Para {getService(lead.service).label}</span>}>
        <ul className="space-y-1">
          {result.criteria.map((c) => (
            <li key={c.key} className="flex items-center gap-3 py-1.5 text-sm">
              <span
                className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full", c.met ? "bg-success/15 text-success" : "bg-surface-2 text-tertiary")}
                aria-hidden
              >
                {c.met ? <Check className="h-3 w-3" strokeWidth={3} /> : <Minus className="h-3 w-3" />}
              </span>
              <span className={cn("flex-1", c.met ? "text-foreground" : "text-muted-foreground")}>{c.label}</span>
              <span className={cn("tabular-nums", c.met ? "font-semibold text-foreground" : "text-muted-foreground")}>
                {c.met ? `+${c.max}` : `0/${c.max}`}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="font-display text-base font-bold tabular-nums">{result.score} / 100</span>
        </div>
      </Section>

      <Section title="Acompanhamento">
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="detail-status">Status</Label>
            <Select
              value={lead.status}
              onValueChange={(v) => {
                updateStatus(lead.id, v as LeadStatus);
                toast.success(`Status: ${getStatus(v as LeadStatus).label}`);
              }}
            >
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
            <span className="font-medium">
              {lead.lastContactAt ? `${formatDate(lead.lastContactAt)} (${formatRelativeDay(lead.lastContactAt)})` : "Ainda não contatado"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="detail-followup">Próximo follow-up</Label>
              {lead.nextFollowUpAt && (
                <span className={cn("text-xs font-medium", overdue ? "text-warning" : "text-muted-foreground")}>
                  {overdue ? `Atrasado · ${formatRelativeDay(lead.nextFollowUpAt)}` : formatRelativeDay(lead.nextFollowUpAt)}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                id="detail-followup"
                type="date"
                value={toDateInputValue(lead.nextFollowUpAt)}
                onChange={(e) => setFollowUp(lead.id, fromDateInputValue(e.target.value))}
                className={cn("tabular-nums", overdue && "border-warning/50")}
              />
              {lead.nextFollowUpAt && (
                <Button variant="ghost" onClick={() => setFollowUp(lead.id, null)}>
                  Limpar
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { d: 1, l: "Amanhã" },
                { d: 3, l: "+3 dias" },
                { d: 7, l: "+1 semana" },
              ].map((o) => (
                <Button key={o.d} variant="outline" size="sm" className="h-11 md:h-9" onClick={() => quickFollowUp(o.d)}>
                  {o.l}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Anotações" id="anotacoes">
        <div className="grid grid-cols-1 gap-2">
          <Label htmlFor="detail-note" className="sr-only">
            Nova anotação
          </Label>
          <Textarea
            id="detail-note"
            ref={notesRef}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: falar com o dono depois das 18h"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveNote();
            }}
          />
          <Button variant="secondary" className="justify-self-end" disabled={!note.trim()} onClick={saveNote}>
            Salvar anotação
          </Button>
        </div>
        {lead.notes.length > 0 && (
          <ul className="mt-4 space-y-2">
            {lead.notes.map((n) => (
              <li key={n.id} className="rounded-md border border-border bg-surface-2/50 p-3">
                <p className="whitespace-pre-wrap text-sm">{n.text}</p>
                <p className="mt-1.5 text-xs text-muted-foreground">{formatDateTime(n.at)}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Histórico de atividades">
        <ol className="relative space-y-4 pl-1">
          {lead.activities.map((a, i) => {
            const Icon = ACTIVITY_ICON[a.type];
            return (
              <li key={a.id} className="relative flex gap-3">
                {i < lead.activities.length - 1 && <span aria-hidden className="absolute left-[15px] top-8 h-[calc(100%-8px)] w-px bg-border" />}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-muted-foreground">
                  {Icon === "whatsapp" ? <WhatsAppIcon className="h-4 w-4 text-whatsapp" /> : <Icon className="h-4 w-4" aria-hidden />}
                </span>
                <div className="min-w-0 pt-1">
                  <p className="text-sm">{a.text}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(a.at)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </Section>
    </div>
  );
}
