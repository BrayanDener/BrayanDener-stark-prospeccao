import { useEffect, useMemo, useRef, useState } from "react";
import { PhoneOff, TriangleAlert, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { WhatsAppIcon } from "@/components/stark/BrandIcons";
import { ResponsivePanel } from "@/components/stark/ResponsivePanel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getService } from "@/config/services";
import { formatNumber } from "@/lib/format";
import { MESSAGE_SOFT_LIMIT, buildTemplateVars, pickTemplate, renderTemplate, sortTemplatesFor } from "@/lib/messages";
import { formatPhone, phoneKind, whatsappUrl } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/app-store";
import { useUI } from "@/store/ui-store";
import type { Lead } from "@/types";

export function WhatsAppPanel() {
  const { whatsappLeadId, closeWhatsApp } = useUI();
  const { getLead } = useApp();
  const lead = whatsappLeadId ? getLead(whatsappLeadId) : undefined;
  const last = useRef<Lead | undefined>(lead);
  if (lead) last.current = lead;
  const shown = lead ?? last.current;

  return shown ? <WhatsAppComposer key={shown.id} lead={shown} open={!!lead} onClose={closeWhatsApp} /> : null;
}

function WhatsAppComposer({ lead, open, onClose }: { lead: Lead; open: boolean; onClose: () => void }) {
  const { templates, settings } = useApp();
  const ordered = useMemo(() => sortTemplatesFor(templates, lead.service), [templates, lead.service]);
  const vars = useMemo(() => buildTemplateVars(lead, settings.signature), [lead, settings.signature]);
  const [templateId, setTemplateId] = useState(() => pickTemplate(templates, lead.service)?.id ?? "");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const tpl = templates.find((t) => t.id === templateId);
    setMessage(tpl ? renderTemplate(tpl.body, vars) : "");
  }, [templateId, templates, vars]);

  const kind = phoneKind(lead.phone);
  const url = whatsappUrl(lead.phone, message.trim());
  const length = message.length;
  const tooLong = length > MESSAGE_SOFT_LIMIT;
  const hasPlaceholder = /\{\{\s*[a-z_]+\s*\}\}|\[Seu nome\]/i.test(message);

  const send = () => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success("WhatsApp aberto", { description: "O registro automático do contato chega na próxima etapa." });
    onClose();
  };

  return (
    <ResponsivePanel
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Enviar WhatsApp"
      description="Revise a mensagem antes de abrir o WhatsApp."
      footer={
        <Button className="w-full" size="lg" disabled={!url || !message.trim()} onClick={send}>
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
            <p className="text-sm tabular-nums text-muted-foreground">{lead.phone ? formatPhone(lead.phone) : "Sem telefone"}</p>
          </div>
        </div>

        {kind === "fixo" && (
          <p className="flex gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Esse número parece ser fixo. Ele pode não ter WhatsApp; se não abrir, tente ligar.
          </p>
        )}
        {kind === "nenhum" && (
          <p className="flex gap-2 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-[#F0A3A3]">
            <PhoneOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Esse lead não tem telefone no Google. Tente pelo Instagram ou Maps.
          </p>
        )}

        <div className="grid grid-cols-1 gap-2">
          <Label htmlFor="wa-template">Modelo</Label>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger id="wa-template">
              <SelectValue placeholder="Escolha um modelo" />
            </SelectTrigger>
            <SelectContent>
              {ordered.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                  {t.service === lead.service ? "" : ` · ${getService(t.service).label}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="wa-message">Mensagem</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Button variant="ghost" size="sm" disabled aria-hidden tabIndex={-1} className="h-9">
                    <WandSparkles className="!size-4" /> Gerar com IA
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted-foreground">Em breve</span>
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Disponível em breve</TooltipContent>
            </Tooltip>
          </div>
          <Textarea id="wa-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={11} className="min-h-[240px]" />
          <div className="flex items-start justify-between gap-3 text-xs">
            <span className={cn(hasPlaceholder ? "text-warning" : "text-muted-foreground")}>
              {hasPlaceholder ? "Ainda há campos para preencher (ex.: [Seu nome]). Ajuste em Configurações." : tooLong ? "Mensagem longa para um primeiro contato." : "Mensagens curtas e pessoais têm mais resposta."}
            </span>
            <span className={cn("shrink-0 tabular-nums", tooLong ? "text-warning" : "text-muted-foreground")}>{formatNumber(length)} caracteres</span>
          </div>
        </div>
      </div>
    </ResponsivePanel>
  );
}
