import { Ellipsis, FileText, Instagram, MapPin, Phone, SquareArrowOutUpRight } from "lucide-react";
import { WhatsAppIcon } from "@/components/stark/BrandIcons";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useRegisterCall } from "@/data/queries";
import { instagramProfileUrl, instagramUrl, mapsUrl } from "@/lib/links";
import { telUrl } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { useUI } from "@/store/ui-store";
import type { Lead } from "@/types";
import { StatusMenuItems } from "./StatusMenuItems";

interface IconLinkProps {
  href: string | null;
  label: string;
  icon: typeof Phone;
  external?: boolean;
  onOpen?: () => void;
}

function IconLink({ href, label, icon: Icon, external, onOpen }: IconLinkProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {href ? (
          <Button asChild variant="secondary" size="icon" aria-label={label}>
            <a
              href={href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              onClick={(e) => {
                e.stopPropagation();
                onOpen?.();
              }}
            >
              <Icon aria-hidden />
            </a>
          </Button>
        ) : (
          <span tabIndex={0} aria-label={`${label} indisponível`}>
            <Button variant="secondary" size="icon" disabled aria-hidden tabIndex={-1}>
              <Icon aria-hidden />
            </Button>
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent>{href ? label : `${label}: indisponível`}</TooltipContent>
    </Tooltip>
  );
}

interface LeadActionsProps {
  lead: Lead;
  /** Mostra o menu "⋯" (status, anotações). */
  withMenu?: boolean;
  className?: string;
}

/** WhatsApp (ação principal) + Ligar, Maps, Instagram e menu. */
export function LeadActions({ lead, withMenu = true, className }: LeadActionsProps) {
  const { openWhatsApp, openLead } = useUI();
  const registerCall = useRegisterCall();
  const hasPhone = lead.phoneType !== "nenhum" && !!(lead.phoneE164 || lead.phoneNational);
  return (
    <div className={cn("relative z-10 flex items-center gap-1.5 sm:gap-2", className)}>
      <Button
        variant="soft"
        className="min-w-0 flex-1 px-3 text-foreground"
        disabled={!hasPhone}
        onClick={(e) => {
          e.stopPropagation();
          openWhatsApp(lead.id);
        }}
      >
        <WhatsAppIcon className="text-whatsapp" />
        <span className="truncate">WhatsApp</span>
      </Button>
      <IconLink href={telUrl(lead.phoneE164 ?? lead.phoneNational)} label="Ligar" icon={Phone} onOpen={() => registerCall.mutate(lead)} />
      <IconLink href={mapsUrl(lead)} label="Abrir no Maps" icon={MapPin} external />
      <IconLink href={instagramUrl(lead)} label={instagramProfileUrl(lead) ? "Instagram" : "Procurar Instagram"} icon={Instagram} external />
      {withMenu && (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Mais ações" onClick={(e) => e.stopPropagation()}>
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
            <StatusMenuItems lead={lead} />
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => openLead(lead.id, { focusNotes: true })}>
              <FileText /> Anotações
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openLead(lead.id)}>
              <SquareArrowOutUpRight /> Ver detalhes
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
