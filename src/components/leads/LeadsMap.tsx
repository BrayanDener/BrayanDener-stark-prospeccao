/**
 * Mapa da busca (Etapa 4): react-leaflet + tiles escuros gratuitos da CARTO (sem chave de API).
 * Marcadores coloridos pela faixa de score; tocar abre um mini card com "Ver lead".
 */
import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPinOff } from "lucide-react";
import { EmptyState } from "@/components/stark/EmptyState";
import { StatusBadge } from "@/components/stark/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatNumber, formatRating } from "@/lib/format";
import { scoreTone, type ScoreTone } from "@/lib/score";
import { useUI } from "@/store/ui-store";
import type { Lead } from "@/types";

const TONE_COLOR: Record<ScoreTone, string> = {
  high: "#34D399",
  mid: "#3B82F6",
  low: "#FBBF24",
  min: "#93A3BC",
};

interface LeadsMapProps {
  leads: Lead[];
  scores: Map<string, number>;
  center: { lat: number; lng: number } | null;
}

function FitBounds({ points, center }: { points: [number, number][]; center: LeadsMapProps["center"] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 15 });
    else if (points.length === 1) map.setView(points[0], 15);
    else if (center) map.setView([center.lat, center.lng], 13);
  }, [map, points, center]);
  return null;
}

export default function LeadsMap({ leads, scores, center }: LeadsMapProps) {
  const { openLead } = useUI();
  const located = useMemo(() => leads.filter((l) => l.lat != null && l.lng != null), [leads]);
  const points = useMemo(() => located.map((l) => [l.lat!, l.lng!] as [number, number]), [located]);
  // Os de maior score por cima.
  const ordered = useMemo(() => [...located].sort((a, b) => (scores.get(a.id) ?? 0) - (scores.get(b.id) ?? 0)), [located, scores]);

  if (located.length === 0 && !center) {
    return (
      <div className="glass flex min-h-[360px] items-center justify-center">
        <EmptyState icon={MapPinOff} title="Sem localização para mostrar" description="Os leads desta lista não têm coordenadas." />
      </div>
    );
  }

  const start: [number, number] = center ? [center.lat, center.lng] : points[0];

  return (
    <div className="glass relative overflow-hidden p-0">
      <MapContainer center={start} zoom={13} scrollWheelZoom className="h-[62dvh] min-h-[360px] w-full bg-background" attributionControl>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />
        <FitBounds points={points} center={center} />
        {ordered.map((lead) => {
          const score = scores.get(lead.id) ?? 0;
          const color = TONE_COLOR[scoreTone(score)];
          return (
            <CircleMarker
              key={lead.id}
              center={[lead.lat!, lead.lng!]}
              radius={9}
              pathOptions={{ color: "#060C17", weight: 2, fillColor: color, fillOpacity: 0.95 }}
            >
              <Popup closeButton={false} className="stark-popup">
                <div className="w-56 space-y-2 font-sans">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display text-sm font-semibold leading-snug text-foreground">{lead.name}</p>
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums" style={{ background: `${color}26`, color }}>
                      {score}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <StatusBadge status={lead.status} />
                    {lead.rating !== null && (
                      <span className="tabular-nums">
                        {formatRating(lead.rating)} ({formatNumber(lead.reviewsCount)})
                      </span>
                    )}
                  </div>
                  <Button size="sm" className="h-9 w-full" onClick={() => openLead(lead.id)}>
                    Ver lead
                  </Button>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      <div className="pointer-events-none absolute left-3 top-3 z-[400] flex flex-wrap gap-1.5">
        {(["high", "mid", "low", "min"] as ScoreTone[]).map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-1 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: TONE_COLOR[t] }} aria-hidden />
            {t === "high" ? "75+" : t === "mid" ? "50–74" : t === "low" ? "30–49" : "<30"}
          </span>
        ))}
      </div>
      {located.length < leads.length && (
        <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">{leads.length - located.length} leads sem localização não aparecem no mapa.</p>
      )}
    </div>
  );
}
