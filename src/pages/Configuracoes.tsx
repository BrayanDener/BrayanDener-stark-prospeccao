import { useEffect, useState } from "react";
import { Activity, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/stark/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useDashboard, useSaveSettings, useSettings } from "@/data/queries";
import { formatNumber } from "@/lib/format";
import { useAuth } from "@/store/auth";
import type { Settings } from "@/types";

type NumericKey = "cacheDays" | "minReviewsBusy" | "followUpDays";

const NUMERIC: { key: NumericKey; label: string; hint: string; min: number; max: number; suffix: string }[] = [
  { key: "cacheDays", label: "Dias de cache das buscas", hint: "Buscas iguais dentro desse prazo reaproveitam o resultado e não gastam a API do Google.", min: 1, max: 365, suffix: "dias" },
  { key: "minReviewsBusy", label: "Mínimo de avaliações para Automações/Apps", hint: "Abaixo disso o negócio é considerado pouco movimentado.", min: 0, max: 100000, suffix: "avaliações" },
  { key: "followUpDays", label: "Follow-up padrão após contato", hint: "Ao enviar o WhatsApp, o próximo follow-up é agendado automaticamente.", min: 1, max: 90, suffix: "dias" },
];

type Draft = Record<NumericKey, string> & Omit<Settings, NumericKey>;

const toDraft = (s: Settings): Draft => ({ ...s, cacheDays: String(s.cacheDays), minReviewsBusy: String(s.minReviewsBusy), followUpDays: String(s.followUpDays) });

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass p-4 md:p-6">
      <h2 className="mb-4 font-display text-base font-semibold">{title}</h2>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export default function ConfiguracoesPage() {
  const settingsQ = useSettings();
  const save = useSaveSettings();
  const summaryQ = useDashboard();
  const { email, signOut } = useAuth();
  const navigate = useNavigate();
  const settings = settingsQ.data;
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    if (settings && !settingsQ.isPlaceholderData) setDraft(toDraft(settings));
  }, [settings, settingsQ.isPlaceholderData]);

  if (!draft || !settings) {
    return (
      <div className="max-w-2xl">
        <PageHeader title="Configurações" description="Ajustes do seu painel de prospecção." />
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  const errors: Partial<Record<NumericKey, string>> = {};
  for (const f of NUMERIC) {
    const n = Number(draft[f.key]);
    if (draft[f.key].trim() === "" || !Number.isInteger(n) || n < f.min || n > f.max) errors[f.key] = `Use um número entre ${f.min} e ${formatNumber(f.max)}.`;
  }
  const signatureOk = draft.signature.trim().length > 0 && draft.signature.trim().length <= 120;
  const valid = Object.keys(errors).length === 0 && signatureOk;
  const dirty =
    NUMERIC.some((f) => Number(draft[f.key]) !== settings[f.key]) || draft.hideContacted !== settings.hideContacted || draft.signature.trim() !== settings.signature;

  const submit = () => {
    if (!valid) return;
    save.mutate({
      cacheDays: Number(draft.cacheDays),
      minReviewsBusy: Number(draft.minReviewsBusy),
      followUpDays: Number(draft.followUpDays),
      hideContacted: draft.hideContacted,
      signature: draft.signature.trim(),
    });
  };

  const numberField = (key: NumericKey) => {
    const f = NUMERIC.find((x) => x.key === key)!;
    return (
      <div className="grid gap-2">
        <Label htmlFor={`cfg-${key}`}>{f.label}</Label>
        <div className="flex items-center gap-3">
          <Input
            id={`cfg-${key}`}
            inputMode="numeric"
            pattern="[0-9]*"
            value={draft[key]}
            onChange={(e) => setDraft((d) => (d ? { ...d, [key]: e.target.value.replace(/\D/g, "") } : d))}
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
        <section className="glass flex items-center gap-4 p-4 md:p-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-2 text-primary">
            <Activity className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">Requisições ao Google neste mês</p>
            {summaryQ.data ? (
              <p className="font-display text-2xl font-bold tabular-nums">
                {formatNumber(summaryQ.data.googleRequestsMonth)}
                <span className="ml-2 text-sm font-normal text-muted-foreground">em {formatNumber(summaryQ.data.searchesMonth)} buscas novas</span>
              </p>
            ) : (
              <Skeleton className="mt-1 h-7 w-24" />
            )}
          </div>
        </section>

        <Card title="Buscas">
          {numberField("cacheDays")}
          {numberField("minReviewsBusy")}
        </Card>
        <Card title="CRM">
          {numberField("followUpDays")}
          <label htmlFor="cfg-hide" className="flex cursor-pointer items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-medium">Ocultar contatados nas buscas</span>
              <span className="mt-1 block text-xs text-muted-foreground">Leads já abordados ficam escondidos por padrão nos resultados.</span>
            </span>
            <Switch id="cfg-hide" checked={draft.hideContacted} onCheckedChange={(v) => setDraft((d) => (d ? { ...d, hideContacted: v } : d))} />
          </label>
        </Card>
        <Card title="Mensagens">
          <div className="grid gap-2">
            <Label htmlFor="cfg-signature">Assinatura das mensagens</Label>
            <Input
              id="cfg-signature"
              value={draft.signature}
              maxLength={120}
              onChange={(e) => setDraft((d) => (d ? { ...d, signature: e.target.value } : d))}
              placeholder="Brayan, da Stark IA"
            />
            <p className={signatureOk ? "text-xs text-muted-foreground" : "text-xs text-danger"}>
              {signatureOk ? "Entra no lugar de {assinatura} nos modelos. Ex.: “Brayan, da Stark IA”." : "Escreva uma assinatura (até 120 caracteres)."}
            </p>
          </div>
        </Card>
        <Card title="Conta">
          <p className="text-sm text-muted-foreground">
            Conectado como <span className="font-medium text-foreground">{email ?? "—"}</span>
          </p>
        </Card>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="destructive" onClick={() => void signOut().then(() => navigate("/login", { replace: true }))}>
            <LogOut /> Sair
          </Button>
          <Button onClick={submit} disabled={!dirty || !valid || save.isPending}>
            {save.isPending ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </div>
  );
}
