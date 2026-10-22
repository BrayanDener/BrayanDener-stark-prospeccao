import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, PhoneOff, RefreshCw, TriangleAlert, WandSparkles } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { WhatsAppIcon } from "@/components/stark/BrandIcons";
import { ResponsivePanel } from "@/components/stark/ResponsivePanel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getNiche } from "@/config/niches";
import { getService } from "@/config/services";
import { generateMessage } from "@/data/api";
import { useLead, useRegisterWhatsApp, useSearch, useSettings, useTemplates } from "@/data/queries";
import { errorMessage } from "@/lib/errors";
import { formatNumber } from "@/lib/format";
import { DEFAULT_TEMPLATES, MESSAGE_SOFT_LIMIT, buildTemplateVars, hasPlaceholders, pickTemplate, renderTemplate, sortTemplatesFor } from "@/lib/messages";
import { formatPhone, whatsappUrl } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { useUI } from "@/store/ui-store";
import type { Lead, ServiceKey } from "@/types";

const DEFAULT_ID = "__padrao__";

export function WhatsAppPanel() {
  const { whatsappLeadId, closeWhatsApp } = useUI();
  const { data: lead } = useLead(whatsappLeadId);
  const last = useRef<Lead | null | undefined>(lead);
  if (lead) last.current = lead;
  const shown = lead ?? last.current;
  const [params] = useSearchParams();
  const { data: search } = useSearch(params.get("busca"));
  const service: ServiceKey = search?.service ?? shown?.lastService ?? "outro";

  if (!shown) return null;
  return <WhatsAppComposer key={`${shown.id}:${service}`} lead={shown} service={service} open={!!whatsappLeadId} onClose={closeWhatsApp} />;
}

function WhatsAppComposer({ lead, service, open, onClose }: { lead: Lead; service: ServiceKey; open: boolean; onClose: () => void }) {
  const { data: templates = [], isLoading: loadingTemplates } = useTemplates();
  const { data: settings } = useSettings();
  const register = useRegisterWhatsApp();
  const signature = settings?.signature ?? "[Seu nome], da Stark IA";

  const ordered = useMemo(() => sortTemplatesFor(templates, service, lead.niche), [templates, service, lead.niche]);
  const vars = useMemo(() => buildTemplateVars(lead, service, signature), [lead, service, signature]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiUsed, setAiUsed] = useState(false);
  const [tone, setTone] = useState<"amigavel" | "direto">("amigavel");

  // Escolha automática: modelo do serviço + nicho, senão o padrão do serviço.
  useEffect(() => {
    if (templateId !== null || loadingTemplates) return;
    const picked = pickTemplate(templates, service, lead.niche);
    setTemplateId(picked?.id ?? DEFAULT_ID);
  }, [templates, loadingTemplates, service, lead.niche, templateId]);

  useEffect(() => {
    if (templateId === null) return;
    const tpl = templates.find((t) => t.id === templateId);
    setMessage(renderTemplate(tpl?.body ?? DEFAULT_TEMPLATES[service].body, vars));
  }, [templateId, templates, vars, service]);

  const hasPhone = lead.phoneType !== "nenhum";
  const url = whatsappUrl(lead.phoneE164 ?? lead.phoneNational, message.trim());
  const tooLong = message.length > MESSAGE_SOFT_LIMIT;
  const pending = hasPlaceholders(message);

  const send = () => {
    if (!url || !message.trim()) return;
    // Abre primeiro (dentro do clique, para o navegador não bloquear); no PWA o sistema abre o app do WhatsApp.
    window.open(url, "_blank", "noopener,noreferrer");
    register.mutate({ lead, message: message.trim() });
    onClose();
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const text = await generateMessage(lead.id, service, tone);
      setMessage(text);
      setAiUsed(true);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <ResponsivePanel
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Enviar WhatsApp"
      description="Revise a mensagem antes de abrir o WhatsApp."
      footer={
        <Button className="w-full" size="lg" disabled={!url || !message.trim() || generating} onClick={send}>
          <WhatsAppIcon /> Abrir WhatsApp
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="glass flex items-center gap-3 p-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2">
            <WhatsAppIcon className="h-5 w-5 text-whatsapp" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{lead.name}</p>
            <p className="text-sm tabular-nums text-muted-foreground">{hasPhone ? formatPhone(lead.phoneE164 ?? lead.phoneNational) : "Sem telefone"}</p>
          </div>
        </div>

        {lead.phoneType === "fixo" && (
          <p className="flex gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Número fixo, pode não ter WhatsApp. Se não abrir, tente ligar.
          </p>
        )}
        {!hasPhone && (
          <p className="flex gap-2 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-[#F0A3A3]">
            <PhoneOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Esse lead não tem telefone no Google. Tente pelo Instagram ou Maps.
          </p>
        )}

        <div className="grid gap-2">
          <Label htmlFor="wa-template">Modelo</Label>
          {loadingTemplates ? (
            <Skeleton className="h-11 w-full" />
          ) : (
            <Select value={templateId ?? DEFAULT_ID} onValueChange={setTemplateId}>
              <SelectTrigger id="wa-template">
                <SelectValue placeholder="Escolha um modelo" />
              </SelectTrigger>
              <SelectContent>
                {ordered.length === 0 && <SelectItem value={DEFAULT_ID}>Padrão · {getService(service).label}</SelectItem>}
                {ordered.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title}
                    {t.niche ? ` · ${getNiche(t.niche)?.label}` : ""}
                    {t.service !== service ? ` · ${getService(t.service).label}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="wa-message">Mensagem</Label>
            <div className="flex items-center gap-1">
              <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
                <SelectTrigger aria-label="Tom da IA" className="h-9 w-auto gap-1.5 border-transparent bg-transparent px-2 text-xs text-muted-foreground hover:bg-surface-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amigavel">Tom amigável</SelectItem>
                  <SelectItem value="direto">Tom direto</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="soft" size="sm" className="h-9" onClick={generate} disabled={generating}>
                {generating ? <Loader2 className="!size-4 animate-spin" /> : aiUsed ? <RefreshCw className="!size-4" /> : <WandSparkles className="!size-4" />}
                {generating ? "Gerando…" : aiUsed ? "Gerar outra" : "Gerar com IA"}
              </Button>
            </div>
          </div>
          <Textarea
            id="wa-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={9}
            className={cn("min-h-[200px]", generating && "opacity-60")}
            disabled={generating}
          />
          <div className="flex items-start justify-between gap-3 text-xs">
            <span className={cn(pending ? "text-warning" : "text-muted-foreground")}>
              {pending
                ? "Ainda há campos para preencher (ex.: [Seu nome]). Ajuste a assinatura em Configurações."
                : tooLong
                  ? "Mensagem longa para um primeiro contato."
                  : "Mensagens curtas e pessoais têm mais resposta."}
            </span>
            <span className={cn("shrink-0 tabular-nums", tooLong ? "text-warning" : "text-muted-foreground")}>{formatNumber(message.length)} caracteres</span>
          </div>
        </div>
      </div>
    </ResponsivePanel>
  );
}
