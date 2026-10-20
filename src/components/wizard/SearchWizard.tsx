import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Filter, History, Loader2, MapPin, Search, Store, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FilterChip } from "@/components/stark/FilterChip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NICHES, getNiche, type NicheKey } from "@/config/niches";
import { SERVICES, getService, type ServiceKey } from "@/config/services";
import { useIsDesktop } from "@/hooks/use-media-query";
import { describeServiceFilter, normalizeText, serviceHasFilter } from "@/lib/filters";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/app-store";
import { useUI, type WizardOpenOptions, type WizardStep } from "@/store/ui-store";
import { WizardProgress } from "./WizardProgress";

const STEP_COPY: Record<WizardStep, { title: string; subtitle: string }> = {
  1: { title: "O que você oferece?", subtitle: "Vamos filtrar leads que realmente precisam do seu serviço." },
  2: { title: "Onde e para quem?", subtitle: "Escolha a cidade e o tipo de negócio que você quer abordar." },
  3: { title: "Tudo certo!", subtitle: "Confira a busca antes de começar." },
};

const slide = {
  enter: (dir: number) => ({ x: dir * 28, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -28, opacity: 0 }),
};

export function SearchWizard() {
  const { wizard, closeWizard } = useUI();
  const isDesktop = useIsDesktop();
  const [busy, setBusy] = useState(false);

  const onOpenChange = (open: boolean) => {
    if (!open && !busy) closeWizard();
  };
  const body = <WizardBody key={wizard.key} options={wizard.options} onClose={closeWizard} onBusyChange={setBusy} isDesktop={isDesktop} />;

  if (isDesktop) {
    return (
      <Dialog open={wizard.open} onOpenChange={onOpenChange}>
        <DialogContent hideClose className="flex max-h-[min(760px,92dvh)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          {body}
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Drawer open={wizard.open} onOpenChange={onOpenChange} handleOnly dismissible={!busy}>
      <DrawerContent fullScreen hideHandle>
        {body}
      </DrawerContent>
    </Drawer>
  );
}

interface WizardBodyProps {
  options: WizardOpenOptions;
  onClose: () => void;
  onBusyChange: (busy: boolean) => void;
  isDesktop: boolean;
}

function WizardBody({ options, onClose, onBusyChange, isDesktop }: WizardBodyProps) {
  const { runSearch, recentCities, settings } = useApp();
  const navigate = useNavigate();
  const init = options.initial ?? {};
  const [step, setStep] = useState<WizardStep>(options.step ?? 1);
  const [dir, setDir] = useState(1);
  const [service, setService] = useState<ServiceKey | null>(init.service ?? null);
  const [city, setCity] = useState(init.city ?? "");
  const [niche, setNiche] = useState<NicheKey | null>(init.niche ?? null);
  const [ignoreFilter, setIgnoreFilter] = useState(init.ignoreFilter ?? false);
  const [loading, setLoading] = useState(false);

  const cityOk = city.trim().length >= 2;
  const canNext = step === 1 ? !!service : step === 2 ? cityOk && !!niche : true;
  const Title = isDesktop ? DialogTitle : DrawerTitle;
  const Desc = isDesktop ? DialogDescription : DrawerDescription;

  const go = (next: WizardStep) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  const submit = async () => {
    if (!service || !niche || !cityOk) return;
    setLoading(true);
    onBusyChange(true);
    try {
      const id = await runSearch({ service, city: city.trim(), niche, ignoreFilter });
      onClose();
      navigate(`/leads?busca=${id}`);
      toast.success("Busca concluída", { description: `${getNiche(niche)?.label} em ${city.trim()}` });
    } catch (err) {
      console.error("[wizard] falha na busca", err);
      toast.error("Não foi possível buscar agora", { description: "Verifique sua conexão e tente de novo." });
    } finally {
      setLoading(false);
      onBusyChange(false);
    }
  };

  const copy = STEP_COPY[step];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Topo: passo + progresso + fechar */}
      <div className="shrink-0 px-4 pb-2 md:px-6" style={{ paddingTop: isDesktop ? 20 : "calc(var(--safe-top) + 12px)" }}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Passo <span className="font-semibold tabular-nums text-foreground">{step}</span> de 3
          </span>
          <Button variant="ghost" size="icon" className="-mr-2" onClick={onClose} disabled={loading} aria-label="Fechar">
            <X className="!size-5" />
          </Button>
        </div>
        <WizardProgress step={step} />
      </div>

      {/* Conteúdo */}
      <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={step}
            custom={dir}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="px-4 pb-6 pt-4 md:px-6"
          >
            <Title className="text-2xl font-bold tracking-tighter">{copy.title}</Title>
            <Desc className="mt-1.5 text-sm">{copy.subtitle}</Desc>

            {step === 1 && <StepService value={service} onChange={setService} />}
            {step === 2 && (
              <StepWhere city={city} onCity={setCity} recentCities={recentCities} niche={niche} onNiche={setNiche} cityOk={cityOk} />
            )}
            {step === 3 && service && niche && (
              <StepSummary
                service={service}
                city={city.trim()}
                niche={niche}
                ignoreFilter={ignoreFilter}
                onIgnoreFilter={setIgnoreFilter}
                filterText={describeServiceFilter(service, settings)}
                onEdit={go}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Rodapé */}
      <div
        className="flex shrink-0 items-center gap-2 border-t border-border bg-surface px-4 pt-3 md:px-6 md:pb-4"
        style={{ paddingBottom: isDesktop ? undefined : "calc(var(--safe-bottom) + 12px)" }}
      >
        {step > 1 && (
          <Button variant="secondary" onClick={() => go((step - 1) as WizardStep)} disabled={loading} className="px-4">
            <ArrowLeft /> Voltar
          </Button>
        )}
        {step < 3 ? (
          <Button className="ml-auto flex-1 md:flex-none md:px-6" disabled={!canNext} onClick={() => go((step + 1) as WizardStep)}>
            Próximo <ArrowRight />
          </Button>
        ) : (
          <Button size="lg" className="ml-auto flex-1 md:flex-none md:px-6" onClick={submit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" /> Buscando empresas…
              </>
            ) : (
              <>
                <Search /> Buscar leads
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function StepService({ value, onChange }: { value: ServiceKey | null; onChange: (v: ServiceKey) => void }) {
  return (
    <div role="radiogroup" aria-label="Serviço" className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
      {SERVICES.map((s) => {
        const active = s.key === value;
        const Icon = s.icon;
        return (
          <button
            key={s.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(s.key)}
            className={cn(
              "glass relative flex min-h-[132px] flex-col items-start gap-3 p-3.5 text-left transition-[border-color,background-color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:active:scale-[0.98] md:p-4",
              active ? "border-primary/80 bg-primary-muted" : "hover:border-border-strong",
            )}
          >
            <span className={cn("flex h-10 w-10 items-center justify-center rounded-md transition-colors", active ? "bg-primary/20 text-primary" : "bg-surface-2 text-muted-foreground")}>
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-[15px] font-semibold leading-snug tracking-tightish">{s.label}</span>
              <span className="mt-1 block text-sm leading-snug text-muted-foreground">{s.filterHint}</span>
            </span>
            <span
              aria-hidden
              className={cn(
                "absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border transition-all duration-150",
                active ? "scale-100 border-primary bg-primary text-primary-foreground" : "scale-90 border-border-strong opacity-0",
              )}
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface StepWhereProps {
  city: string;
  onCity: (v: string) => void;
  recentCities: string[];
  niche: NicheKey | null;
  onNiche: (v: NicheKey) => void;
  cityOk: boolean;
}

function StepWhere({ city, onCity, recentCities, niche, onNiche, cityOk }: StepWhereProps) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = normalizeText(query);
    if (!q) return NICHES;
    return NICHES.filter((n) => normalizeText(`${n.label} ${n.keywords.join(" ")}`).includes(q));
  }, [query]);

  return (
    <div className="mt-5 space-y-6">
      <div>
        <Label htmlFor="wizard-city">Cidade</Label>
        <div className="relative mt-2">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-tertiary" aria-hidden />
          <Input
            id="wizard-city"
            value={city}
            onChange={(e) => onCity(e.target.value)}
            placeholder="Ex.: Itabira, Belo Horizonte"
            autoComplete="address-level2"
            enterKeyHint="next"
            className="pl-10"
          />
        </div>
        {city.length > 0 && !cityOk && <p className="mt-1.5 text-xs text-warning">Digite o nome completo da cidade.</p>}
        {recentCities.length > 0 && (
          <div className="mt-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <History className="h-3.5 w-3.5" aria-hidden /> Usadas recentemente
            </div>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar md:mx-0 md:flex-wrap md:px-0">
              {recentCities.map((c) => (
                <FilterChip key={c} active={c.toLowerCase() === city.trim().toLowerCase()} onClick={() => onCity(c)} showCheck={false}>
                  {c}
                </FilterChip>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <Label htmlFor="wizard-niche-search">Nicho</Label>
          {niche && <span className="text-xs text-muted-foreground">{getNiche(niche)?.keywords.join(", ")}</span>}
        </div>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-tertiary" aria-hidden />
          <Input id="wizard-niche-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar nicho" className="pl-10" />
        </div>
        <div role="radiogroup" aria-label="Nicho" className="mt-3 flex flex-wrap gap-2">
          {filtered.map((n) => (
            <FilterChip key={n.key} role="radio" aria-checked={niche === n.key} active={niche === n.key} onClick={() => onNiche(n.key)}>
              {n.label}
            </FilterChip>
          ))}
          {filtered.length === 0 && (
            <p className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
              <Store className="h-4 w-4" aria-hidden /> Nenhum nicho com esse nome. Os nichos ficam em src/config/niches.ts.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface StepSummaryProps {
  service: ServiceKey;
  city: string;
  niche: NicheKey;
  ignoreFilter: boolean;
  onIgnoreFilter: (v: boolean) => void;
  filterText: string;
  onEdit: (step: WizardStep) => void;
}

function StepSummary({ service, city, niche, ignoreFilter, onIgnoreFilter, filterText, onEdit }: StepSummaryProps) {
  const s = getService(service);
  const ServiceIcon = s.icon;
  const hasFilter = serviceHasFilter(service);
  const rows = [
    { label: "Serviço", value: s.label, icon: ServiceIcon, step: 1 as WizardStep },
    { label: "Cidade", value: city, icon: MapPin, step: 2 as WizardStep },
    { label: "Nicho", value: getNiche(niche)?.label ?? niche, icon: Store, step: 2 as WizardStep },
  ];
  return (
    <div className="mt-5 space-y-4">
      <dl className="glass divide-y divide-border">
        {rows.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.label} className="flex min-h-14 items-center gap-3 px-4 py-2">
              <Icon className="h-[18px] w-[18px] shrink-0 text-tertiary" aria-hidden />
              <dt className="w-16 shrink-0 text-sm text-muted-foreground">{r.label}</dt>
              <dd className="min-w-0 flex-1 truncate text-sm font-semibold">{r.value}</dd>
              <button type="button" onClick={() => onEdit(r.step)} className="-mr-2 h-11 shrink-0 rounded-md px-2 text-sm font-medium text-primary hover:text-primary-hover">
                Editar
              </button>
            </div>
          );
        })}
      </dl>

      <div className={cn("rounded-lg border p-4 transition-colors duration-150", ignoreFilter || !hasFilter ? "border-border bg-surface" : "border-primary/30 bg-primary-muted")}>
        <div className="flex items-start gap-3">
          <Filter className={cn("mt-0.5 h-[18px] w-[18px] shrink-0", ignoreFilter || !hasFilter ? "text-tertiary" : "text-primary")} aria-hidden />
          <p className="text-sm leading-relaxed">
            <span className="font-semibold">{ignoreFilter && hasFilter ? "Filtro desligado: " : "Filtro ativo: "}</span>
            <span className="text-muted-foreground">{ignoreFilter && hasFilter ? "todos os resultados vão aparecer." : filterText}</span>
          </p>
        </div>
      </div>

      {hasFilter && (
        <label htmlFor="ignore-filter" className="glass flex min-h-14 cursor-pointer items-center justify-between gap-4 px-4 py-3">
          <span className="text-sm">
            <span className="block font-medium">Mostrar todos os resultados</span>
            <span className="block text-muted-foreground">Ignorar o filtro do serviço</span>
          </span>
          <Switch id="ignore-filter" checked={ignoreFilter} onCheckedChange={onIgnoreFilter} />
        </label>
      )}
    </div>
  );
}

