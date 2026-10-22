import { DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { STATUSES } from "@/config/status";
import { useSetStatus } from "@/data/queries";
import { cn } from "@/lib/utils";
import type { Lead, LeadStatus } from "@/types";

/** Itens de status para dentro de um DropdownMenuContent (otimista, com "Desfazer" no toast). */
export function StatusMenuItems({ lead, label = "Mudar status" }: { lead: Lead; label?: string }) {
  const setStatus = useSetStatus();
  return (
    <>
      <DropdownMenuLabel>{label}</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={lead.status}
        onValueChange={(v) => {
          if (v !== lead.status) setStatus.mutate({ lead, status: v as LeadStatus });
        }}
      >
        {STATUSES.map((s) => (
          <DropdownMenuRadioItem key={s.key} value={s.key}>
            <span className={cn("h-2 w-2 rounded-full", s.dot)} aria-hidden />
            {s.label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </>
  );
}
