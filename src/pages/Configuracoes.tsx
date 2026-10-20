import { useState } from "react";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/stark/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/store/app-store";
import { endSession } from "@/store/session";
import type { Settings } from "@/types";

type NumericKey = "cacheDays" | "minReviews" | "followUpDays";

const NUMERIC: { key: NumericKey; label: string; hint: string; min: number; max: number; suffix: string }[] = [
  { key: "cacheDays", label: "Dias de cache das buscas", hint: "Buscas iguais dentro desse prazo reaproveitam o resultado e não gastam a API do Google.", min: 1, max: 180, suffix: "dias" },
  { key: "minReviews", label: "Mínimo de avaliações para Automações/Apps", hint: "Abaixo disso o negócio é considerado pouco movimentado.", min: 0, max: 5000, suffix: "avaliações" },
  { key: "followUpDays", label: "Follow-up padrão após contato", hint: "Ao marcar um lead como contatado, o próximo follow-up é agendado automaticamente.", min: 1, max: 60, suffix: "dias" },
];

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass p-4 md:p-6">
      <h2 className="mb-4 font-display text-base font-semibold">{title}</h2>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export default function ConfiguracoesPage() {
  const { settings, updateSettings } = useApp();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Record<NumericKey, string> & Omit<Settings, NumericKey>>({
    ...settings,
    cacheDays: String(settings.cacheDays),
    minReviews: String(settings.minReviews),
    followUpDays: String(settings.followUpDays),
  });

  const errors: Partial<Record<NumericKey, string>> = {};
  for (const f of NUMERIC) {
    const n = Number(draft[f.key]);
    if (draft[f.key].trim() === "" || !Number.isInteger(n) || n < f.min || n > f.max) errors[f.key] = `Use um número entre ${f.min} e ${f.max}.`;
  }
  const valid = Object.keys(errors).length === 0 && draft.signature.trim().length > 0;
  const dirty =
    NUMERIC.some((f) => Number(draft[f.key]) !== settings[f.key]) || draft.hideContacted !== settings.hideContacted || draft.signature !== settings.signature;

  const save = () => {
    if (!valid) return;
    updateSettings({
      cacheDays: Number(draft.cacheDays),
      minReviews: Number(draft.minReviews),
      followUpDays: Number(draft.followUpDays),
      hideContacted: draft.hideContacted,
      signature: draft.signature.trim(),
    });
    toast.success("Configurações salvas");
  };

  const numberField = (key: NumericKey) => {
    const f = NUMERIC.find((x) => x.key === key)!;
    return (
      <div className="grid grid-cols-1 gap-2">
        <Label htmlFor={`cfg-${key}`}>{f.label}</Label>
        <div className="flex items-center gap-3">
          <Input
            id={`cfg-${key}`}
            inputMode="numeric"
            pattern="[0-9]*"
            value={draft[key]}
            onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value.replace(/\D/g, "") }))}
            aria-invalid={!!errors[key]}
            aria-describedby={`cfg-${key}-hint`}
            className="w-28 tabular-nums aria-[invalid=true]:border-danger/60"
          />
          <span className="text-sm text-muted-foreground">{f.suffix}</span>
        </div>
        <p id={`cfg-${key}-hint`} className={errors[key] ? "text-xs text-danger" : "text-xs text-muted-foreground"}>
          {errors[key] ?? f.hint}
        </p>
      </div>
    );
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="Configurações" description="Ajustes do seu painel de prospecção." />
      <div className="space-y-4">
        <Card title="Buscas">
          {numberField("cacheDays")}
          {numberField("minReviews")}
        </Card>
        <Card title="CRM">
          {numberField("followUpDays")}
          <label htmlFor="cfg-hide" className="flex cursor-pointer items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-medium">Ocultar contatados nas buscas</span>
              <span className="mt-1 block text-xs text-muted-foreground">Leads já abordados ficam escondidos por padrão nos resultados.</span>
            </span>
            <Switch id="cfg-hide" checked={draft.hideContacted} onCheckedChange={(v) => setDraft((d) => ({ ...d, hideContacted: v }))} />
          </label>
        </Card>
        <Card title="Mensagens">
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="cfg-signature">Assinatura das mensagens</Label>
            <Input id="cfg-signature" value={draft.signature} onChange={(e) => setDraft((d) => ({ ...d, signature: e.target.value }))} placeholder="Seu nome, da Stark IA" />
            <p className="text-xs text-muted-foreground">Entra no lugar de {"{{assinatura}}"} nos modelos.</p>
          </div>
        </Card>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="destructive"
            onClick={() => {
              endSession();
              navigate("/login", { replace: true });
            }}
          >
            <LogOut /> Sair
          </Button>
          <Button onClick={save} disabled={!dirty || !valid}>
            Salvar alterações
          </Button>
        </div>
      </div>
    </div>
  );
}
