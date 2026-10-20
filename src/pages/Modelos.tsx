import { useMemo, useRef, useState } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/stark/EmptyState";
import { ErrorState } from "@/components/stark/ErrorState";
import { PageHeader } from "@/components/stark/PageHeader";
import { ResponsivePanel } from "@/components/stark/ResponsivePanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { SERVICES, getService } from "@/config/services";
import { useSimulatedLoad } from "@/hooks/use-simulated-load";
import { formatRelativeDay } from "@/lib/format";
import { TEMPLATE_VARIABLES, buildTemplateVars, renderTemplate } from "@/lib/messages";
import { uid } from "@/lib/utils";
import { useApp } from "@/store/app-store";
import type { MessageTemplate, ServiceKey } from "@/types";

export default function ModelosPage() {
  const { templates } = useApp();
  const { status, retry } = useSimulatedLoad("modelos");
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [open, setOpen] = useState(false);

  const grouped = useMemo(
    () => SERVICES.map((s) => ({ service: s, items: templates.filter((t) => t.service === s.key) })).filter((g) => g.items.length > 0),
    [templates],
  );

  const edit = (t: MessageTemplate | null) => {
    setEditing(t ?? { id: uid("tpl"), service: "sites", name: "", body: "", updatedAt: new Date().toISOString() });
    setOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Modelos"
        description="Mensagens de primeiro contato por serviço. Use variáveis como {{empresa}}."
        actions={
          <Button onClick={() => edit(null)}>
            <Plus /> Novo modelo
          </Button>
        }
      />

      {status === "loading" && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="glass space-y-3 p-4">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ))}
        </div>
      )}
      {status === "error" && <ErrorState onRetry={retry} />}
      {status === "ready" && templates.length === 0 && (
        <EmptyState icon={FileText} title="Nenhum modelo" description="Crie um modelo para agilizar suas abordagens." action={<Button onClick={() => edit(null)}>Criar modelo</Button>} />
      )}
      {status === "ready" && templates.length > 0 && (
        <div className="space-y-6">
          {grouped.map(({ service, items }) => {
            const Icon = service.icon;
            return (
              <section key={service.key}>
                <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <Icon className="h-4 w-4" aria-hidden /> {service.label}
                </h2>
                <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {items.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => edit(t)}
                        className="glass block h-full w-full p-4 text-left transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className="font-display text-base font-semibold">{t.name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeDay(t.updatedAt)}</span>
                        </span>
                        <span className="mt-2 line-clamp-3 block whitespace-pre-line text-sm text-muted-foreground">{t.body}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {editing && <TemplateEditor key={editing.id} template={editing} open={open} onClose={() => setOpen(false)} />}
    </div>
  );
}

function TemplateEditor({ template, open, onClose }: { template: MessageTemplate; open: boolean; onClose: () => void }) {
  const { templates, leads, settings, saveTemplate, deleteTemplate } = useApp();
  const isNew = !templates.some((t) => t.id === template.id);
  const [name, setName] = useState(template.name);
  const [service, setService] = useState<ServiceKey>(template.service);
  const [body, setBody] = useState(template.body);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const sample = leads.find((l) => l.inCrm && l.service === service) ?? leads[0];
  const preview = sample ? renderTemplate(body, buildTemplateVars(sample, settings.signature)) : body;
  const valid = name.trim().length > 0 && body.trim().length > 0;

  const insertVariable = (key: string) => {
    const el = bodyRef.current;
    const token = `{{${key}}}`;
    if (!el) return setBody((b) => b + token);
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const save = () => {
    if (!valid) return;
    saveTemplate({ ...template, name: name.trim(), service, body, updatedAt: new Date().toISOString() });
    toast.success(isNew ? "Modelo criado" : "Modelo salvo");
    onClose();
  };

  return (
    <ResponsivePanel
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={isNew ? "Novo modelo" : "Editar modelo"}
      description="As variáveis são trocadas pelos dados do lead na hora do envio."
      footer={
        <div className="flex gap-2">
          {!isNew && (
            <Button
              variant="destructive"
              size="icon"
              aria-label="Excluir modelo"
              onClick={() => {
                deleteTemplate(template.id);
                toast.success("Modelo excluído", { action: { label: "Desfazer", onClick: () => saveTemplate(template) } });
                onClose();
              }}
            >
              <Trash2 />
            </Button>
          )}
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="flex-1" disabled={!valid} onClick={save}>
            Salvar
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-2">
          <Label htmlFor="tpl-name">Nome</Label>
          <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Sites — primeiro contato" />
        </div>
        <div className="grid grid-cols-1 gap-2">
          <Label htmlFor="tpl-service">Serviço</Label>
          <Select value={service} onValueChange={(v) => setService(v as ServiceKey)}>
            <SelectTrigger id="tpl-service">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SERVICES.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <Label htmlFor="tpl-body">Mensagem</Label>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATE_VARIABLES.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => insertVariable(v.key)}
                className="h-9 rounded-full border border-border-strong bg-surface px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                + {v.label}
              </button>
            ))}
          </div>
          <Textarea id="tpl-body" ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} rows={9} className="min-h-[200px] font-[inherit]" />
        </div>
        {sample && body.trim() && (
          <div className="grid grid-cols-1 gap-2">
            <span className="text-sm font-medium">
              Prévia <span className="font-normal text-muted-foreground">com {sample.name} · {getService(service).label}</span>
            </span>
            <div className="rounded-lg rounded-tl-sm border border-border bg-surface-2/60 p-3.5 text-sm leading-relaxed whitespace-pre-wrap">{preview}</div>
          </div>
        )}
      </div>
    </ResponsivePanel>
  );
}
