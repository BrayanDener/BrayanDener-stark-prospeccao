import { toast } from "sonner";
import { DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { STATUSES, getStatus } from "@/config/status";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/app-store";
import type { Lead, LeadStatus } from "@/types";

/** Itens de status para dentro de um DropdownMenuContent (com "Desfazer" no toast). */
export function StatusMenuItems({ lead, label = "Mudar status" }: { lead: Lead; label?: string }) {
  const { updateStatus } = useApp();
  const change = (value: string) => {
    const next = value as LeadStatus;
    if (next === lead.status) return;
    const prev = lead.status;
    updateStatus(lead.id, next);
    toast.success(`${lead.name}`, {
      description: `Status: ${getStatus(next).label}`,
      action: { label: "Desfazer", onClick: () => updateStatus(lead.id, prev) },
    });
  };
  return (
    <>
      <DropdownMenuLabel>{label}</DropdownMenuLabel>
      <DropdownMenuRadioGroup value={lead.status} onValueChange={change}>
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
