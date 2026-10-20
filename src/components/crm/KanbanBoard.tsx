import { useState } from "react";
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { STATUSES, getStatus, type StatusConfig } from "@/config/status";
import { useIsDesktop } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/app-store";
import type { Lead, LeadStatus } from "@/types";
import { CrmCard } from "./CrmCard";

interface KanbanBoardProps {
  leads: Lead[];
  scores: Map<string, number>;
}

/** 6 colunas por status. Desktop: arrastar e soltar. Celular: rolagem com snap + "Mover para…". */
export function KanbanBoard({ leads, scores }: KanbanBoardProps) {
  const isDesktop = useIsDesktop();
  const { updateStatus } = useApp();
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const active = activeId ? leads.find((l) => l.id === activeId) : undefined;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const to = e.over?.id as LeadStatus | undefined;
    const lead = leads.find((l) => l.id === e.active.id);
    if (!to || !lead || lead.status === to) return;
    const prev = lead.status;
    updateStatus(lead.id, to);
    toast.success(lead.name, {
      description: `Movido para ${getStatus(to).label}`,
      action: { label: "Desfazer", onClick: () => updateStatus(lead.id, prev) },
    });
  };

  const columns = (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-4 no-scrollbar md:-mx-8 md:snap-none md:scroll-px-8 md:px-8">
      {STATUSES.map((s) => (
        <Column key={s.key} status={s} leads={leads.filter((l) => l.status === s.key)} scores={scores} draggable={isDesktop} />
      ))}
    </div>
  );

  if (!isDesktop) return columns;

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
      {columns}
      <DragOverlay dropAnimation={{ duration: 180, easing: "ease-out" }}>
        {active ? <CrmCard lead={active} score={scores.get(active.id) ?? 0} overlay className="w-[268px] cursor-grabbing" /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({ status, leads, scores, draggable }: { status: StatusConfig; leads: Lead[]; scores: Map<string, number>; draggable: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: status.key, disabled: !draggable });
  return (
    <section
      aria-label={`${status.label}: ${leads.length} leads`}
      className="flex w-[84%] max-w-[300px] shrink-0 snap-start flex-col sm:w-[300px] md:w-[284px]"
    >
      <header className="mb-2 flex h-9 items-center gap-2 px-1">
        <span className={cn("h-2 w-2 rounded-full", status.dot)} aria-hidden />
        <h2 className="font-display text-sm font-semibold">{status.label}</h2>
        <span className="ml-auto rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">{leads.length}</span>
      </header>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[200px] flex-1 flex-col gap-2 rounded-lg border border-dashed border-transparent bg-surface/40 p-2 transition-colors duration-150",
          isOver && "border-primary/50 bg-primary-muted",
        )}
      >
        {leads.map((l) =>
          draggable ? <DraggableCard key={l.id} lead={l} score={scores.get(l.id) ?? 0} /> : <CrmCard key={l.id} lead={l} score={scores.get(l.id) ?? 0} />,
        )}
        {leads.length === 0 && <p className="px-2 py-6 text-center text-xs text-muted-foreground">{draggable ? "Arraste leads para cá" : "Nenhum lead"}</p>}
      </div>
    </section>
  );
}

function DraggableCard({ lead, score }: { lead: Lead; score: number }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: lead.id });
  return <CrmCard ref={setNodeRef} lead={lead} score={score} dragging={isDragging} className="cursor-grab" {...listeners} {...attributes} />;
}
