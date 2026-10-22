import { useMemo, useRef, useState } from "react";
import { FileText, Plus, RotateCcw, Trash2 } from "lucide-react";
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
import { NICHES, getNiche, type NicheKey } from "@/config/niches";
import { SERVICES, getService, type ServiceKey } from "@/config/services";
import { useAllLeads, useDeleteTemplate, useSaveTemplate, useSettings, useTemplates } from "@/data/queries";
import { formatRelativeDay } from "@/lib/format";
import { DEFAULT_TEMPLATES, TEMPLATE_VARIABLES, buildTemplateVars, renderTemplate } from "@/lib/messages";
import type { Lead, MessageTemplate } from "@/types";

const NO_NICHE = "__todos__";

/** Lead de exemplo para a prévia quando ainda não há leads salvos. */
const SAMPLE_LEAD: Pick<Lead, "name" | "city" | "niche"> = { name: "Barbearia Dom Bigode", city: "Itabira", niche: "barbearias" };

type Editing = { id?: string; service: ServiceKey; niche: NicheKey | null; title: string; body: string; isDefault: boolean };

export default function ModelosPage() {
  const templatesQ = useTemplates();
  const saveTemplate = useSaveTemplate();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [open, setOpen] = useState(false);
  const templates = templatesQ.data ?? [];

  const grouped = useMemo(
    () => SERVICES.map((s) => ({ service: s, items: templates.filter((t) => t.service === s.key).sort((a, b) => Number(!!a.niche) - Number(!!b.niche)) })),
    [templates],
  );

  const edit = (t: MessageTemplate | null, service: ServiceKey = "sites") => {
    setEditing(t ? { ...t } : { service, niche: null, title: "", body: "", isDefault: false });
    setOpen(true);
  };

  const restoreDefault = (service: ServiceKey) => {
    const existing = templates.find((t) => t.service === service && t.niche === null);
    const def = DEFAULT_TEMPLATES[service];
    saveTemplate.mutate(
      { id: existing?.id, service, niche: null, title: def.title, body: def.body, isDefault: true },
      { onSuccess: () => toast.success("Modelo padrão restaurado", { description: getService(service).label }) },
    );
  };

  return (
    <div>
      <PageHeader
        title="Modelos"
        description="Mensagens de primeiro contato por serviço e, se quiser, por nicho. Variáveis: {empresa}, {nicho}, {cidade}, {servico}, {assinatura}."
        actions={
          <Button onClick={() => edit(null)}>
            <Plus /> Novo modelo
          </Button>
        }
      />

      {templatesQ.isLoading && (
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
      {templatesQ.isError && <ErrorState onRetry={() => void templatesQ.refetch()} />}
      {templatesQ.isSuccess && templates.length === 0 && (
        <EmptyState icon={FileText} title="Nenhum modelo" description="Crie um modelo para agilizar suas abordagens." action={<Button onClick={() => edit(null)}>Criar modelo</Button>} />
      )}
      {templatesQ.isSuccess && templates.length > 0 && (
        <div className="space-y-6">
          {grouped.map(({ service, items }) => {
            const Icon = service.icon;
            return (
              <section key={service.key}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <Icon className="h-4 w-4" aria-hidden /> {service.label}
                  </h2>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-11 md:h-9" onClick={() => restoreDefault(service.key)} disabled={saveTemplate.isPending}>
                      <RotateCcw className="!size-4" /> Restaurar padrão
                    </Button>
                    <Button variant="ghost" size="sm" className="h-11 md:h-9" onClick={() => edit(null, service.key)}>
                      <Plus className="!size-4" /> <span className="hidden sm:inline">Por nicho</span>
                    </Button>
                  </div>
                </div>
                {items.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">Sem modelo para este serviço. Use "Restaurar padrão".</p>
                ) : (
                  <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {items.map((t) => (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => edit(t)}
                          className="glass block h-full w-full p-4 text-left transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="flex items-start justify-between gap-3">
                            <span className="font-display text-base font-semibold">{t.title}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeDay(t.updatedAt)}</span>
                          </span>
                          <span className="mt-1 block text-xs font-medium text-primary-hover">{t.niche ? `Só ${getNiche(t.niche)?.label}` : "Padrão do serviço"}</span>
                          <span className="mt-2 line-clamp-3 block whitespace-pre-line text-sm text-muted-foreground">{t.body}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {editing && <TemplateEditor key={editing.id ?? `novo-${editing.service}`} template={editing} open={open} onClose={() => setOpen(false)} />}
    </div>
  );
}

function TemplateEditor({ template, open, onClose }: { template: Editing; open: boolean; onClose: () => void }) {
  const saveTemplate = useSaveTemplate();
  const deleteTemplate = useDeleteTemplate();
  const { data: settings } = useSettings();
  const { data: leads } = useAllLeads();
  const isNew = !template.id;
  const [title, setTitle] = useState(template.title);
  const [service, setService] = useState<ServiceKey>(template.service);
  const [niche, setNiche] = useState<NicheKey | null>(template.niche);
  const [body, setBody] = useState(template.body);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const sample = leads?.find((l) => (niche ? l.niche === niche : true)) ?? SAMPLE_LEAD;
  const preview = renderTemplate(body, buildTemplateVars(sample, service, settings?.signature ?? "[Seu nome], da Stark IA"));
  const valid = title.trim().length > 0 && body.trim().length > 0 && body.length <= 2000;

  const insertVariable = (key: string) => {
    const el = bodyRef.current;
    const token = `{${key}}`;
    if (!el) return setBody((b) => b + token);
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    setBody(body.slice(0, start) + token + body.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const save = () => {
    if (!valid) return;
    saveTemplate.mutate(
      { id: template.id, service, niche, title: title.trim(), body, isDefault: template.isDefault && niche === null },
      {
        onSuccess: () => {
          toast.success(isNew ? "Modelo criado" : "Modelo salvo");
          onClose();
        },
      },
    );
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
              disabled={deleteTemplate.isPending}
              onClick={() =>
                deleteTemplate.mutate(template.id!, {
                  onSuccess: () => {
                    toast.success("Modelo excluído");
                    onClose();
                  },
                })
              }
            >
              <Trash2 />
            </Button>
          )}
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="flex-1" disabled={!valid || saveTemplate.isPending} onClick={save}>
            {saveTemplate.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-2">
          <Label htmlFor="tpl-title">Nome</Label>
          <Input id="tpl-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Sites — primeiro contato" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
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
          <div className="grid gap-2">
            <Label htmlFor="tpl-niche">Nicho (opcional)</Label>
            <Select value={niche ?? NO_NICHE} onValueChange={(v) => setNiche(v === NO_NICHE ? null : (v as NicheKey))}>
              <SelectTrigger id="tpl-niche">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_NICHE}>Todos os nichos</SelectItem>
                {NICHES.map((n) => (
                  <SelectItem key={n.key} value={n.key}>
                    {n.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-2">
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
          <Textarea id="tpl-body" ref={bodyRef} value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} rows={8} className="min-h-[180px]" />
        </div>
        {body.trim() && (
          <div className="grid gap-2">
            <span className="text-sm font-medium">
              Prévia <span className="font-normal text-muted-foreground">com {sample.name}</span>
            </span>
            <div className="whitespace-pre-wrap rounded-lg rounded-tl-sm border border-border bg-surface-2/60 p-3.5 text-sm leading-relaxed">{preview}</div>
          </div>
        )}
      </div>
    </ResponsivePanel>
  );
}
