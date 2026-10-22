import { ArrowRight, Database, RotateCw } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getNiche } from "@/config/niches";
import { getService } from "@/config/services";
import { formatDate, formatNumber, formatRelativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useUI } from "@/store/ui-store";
import type { Search } from "@/types";

/** Linha de busca (Dashboard e Histórico) com "Ver resultados" e "Refazer". */
export function SearchItem({ search, variant = "compact" }: { search: Search; variant?: "compact" | "full" }) {
  const { openWizard } = useUI();
  const service = getService(search.service);
  const Icon = service.icon;
  const title = `${getNiche(search.niche)?.label} em ${search.city}`;
  // Refazer reabre a busca salva: dentro do prazo do cache, não chama o Google.
  const redo = () => openWizard({ initial: { service: search.service, city: search.city, niche: search.niche, showAll: search.showAll }, step: 3 });

  if (variant === "compact") {
    return (
      <li className="relative flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-surface-2/50">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-muted-foreground">
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <Link to={`/leads?busca=${search.id}`} className="block truncate text-sm font-semibold after:absolute after:inset-0 after:content-['']">
            {title}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            {formatRelativeDay(search.createdAt)} · <span className="tabular-nums">{search.totalQualified}</span> qualificados
          </p>
        </div>
        <Button variant="ghost" size="sm" className="relative z-10 h-11 shrink-0 md:h-9" onClick={redo}>
          <RotateCw className="!size-4" /> Refazer
        </Button>
      </li>
    );
  }

  return (
    <li className="glass flex flex-col gap-4 p-4 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-2 text-muted-foreground">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-semibold">{title}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            <span>
              {service.label} · {formatDate(search.createdAt)}
            </span>
            {search.fromCache && (
              <span className="inline-flex items-center gap-1 text-xs">
                <Database className="h-3.5 w-3.5" aria-hidden /> do cache
              </span>
            )}
          </p>
          <p className="mt-2 flex flex-wrap gap-x-3 text-sm">
            <span>
              <span className="font-semibold tabular-nums">{formatNumber(search.totalFound)}</span> <span className="text-muted-foreground">encontrados</span>
            </span>
            <span>
              <span className="font-semibold tabular-nums text-primary-hover">{formatNumber(search.totalQualified)}</span> <span className="text-muted-foreground">qualificados</span>
            </span>
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1 md:flex-none" onClick={redo}>
          <RotateCw /> Refazer
        </Button>
        <Button asChild className="flex-1 md:flex-none" disabled={search.totalFound === 0}>
          <Link to={`/leads?busca=${search.id}`}>
            Ver resultados <ArrowRight />
          </Link>
        </Button>
      </div>
    </li>
  );
}

export function SearchItemSkeleton({ variant = "compact" }: { variant?: "compact" | "full" }) {
  return (
    <li className={cn("flex items-center gap-3", variant === "full" ? "glass p-4" : "px-2 py-2.5")} aria-hidden>
      <Skeleton className="h-9 w-9" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-9 w-20" />
    </li>
  );
}
