import { useState } from "react";
import { ChevronRight, LogOut, Search } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { MORE_ICON, PRIMARY_NAV, SECONDARY_NAV, type NavItem } from "@/config/nav";
import { cn } from "@/lib/utils";
import { endSession } from "@/store/session";
import { useUI } from "@/store/ui-store";

const itemClass = "flex h-full min-w-0 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-150";

function TabLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink to={item.to} end={item.to === "/"} className={({ isActive }) => cn(itemClass, isActive ? "text-foreground" : "text-muted-foreground")}>
      {({ isActive }) => (
        <>
          <Icon className={cn("h-[22px] w-[22px]", isActive && "text-primary")} strokeWidth={isActive ? 2.2 : 1.8} aria-hidden />
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

/** Barra inferior do celular: Início, Leads, [Buscar], CRM, Mais. */
export function BottomNav() {
  const { openWizard } = useUI();
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const moreActive = SECONDARY_NAV.some((i) => location.pathname.startsWith(i.to));
  const [home, leads, crm] = PRIMARY_NAV;
  const MoreIcon = MORE_ICON;

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 md:hidden"
        style={{ paddingBottom: "var(--safe-bottom)" }}
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-2">
          <TabLink item={home} />
          <TabLink item={leads} />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => openWizard()}
              aria-label="Buscar leads"
              className="-mt-6 flex flex-col items-center gap-1 text-xs font-medium text-foreground focus-visible:outline-none"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.7)] ring-4 ring-background transition-transform duration-150 motion-safe:active:scale-[0.96]">
                <Search className="h-6 w-6" strokeWidth={2.2} aria-hidden />
              </span>
              Buscar
            </button>
          </div>
          <TabLink item={crm} />
          <button type="button" onClick={() => setMoreOpen(true)} className={cn(itemClass, moreActive ? "text-foreground" : "text-muted-foreground")}>
            <MoreIcon className={cn("h-[22px] w-[22px]", moreActive && "text-primary")} strokeWidth={moreActive ? 2.2 : 1.8} aria-hidden />
            Mais
          </button>
        </div>
      </nav>

      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent>
          <div className="px-4 pb-2 pt-3">
            <DrawerTitle className="text-base">Mais opções</DrawerTitle>
            <DrawerDescription className="sr-only">Histórico, modelos de mensagem e configurações</DrawerDescription>
          </div>
          <div className="flex flex-col px-2 pb-2">
            {SECONDARY_NAV.map((item) => {
              const Icon = item.icon;
              const active = location.pathname.startsWith(item.to);
              return (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    navigate(item.to);
                  }}
                  className={cn("flex h-14 items-center gap-3 rounded-md px-3 text-left text-base transition-colors active:bg-surface-2", active ? "text-foreground" : "text-foreground/90")}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-2">
                    <Icon className={cn("h-[18px] w-[18px]", active ? "text-primary" : "text-muted-foreground")} aria-hidden />
                  </span>
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight className="h-4 w-4 text-tertiary" aria-hidden />
                </button>
              );
            })}
            <div className="mx-3 my-2 h-px bg-border" />
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                endSession();
                navigate("/login", { replace: true });
              }}
              className="flex h-14 items-center gap-3 rounded-md px-3 text-left text-base text-[#F0A3A3] active:bg-surface-2"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-danger/10">
                <LogOut className="h-[18px] w-[18px]" aria-hidden />
              </span>
              Sair
            </button>
          </div>
          <div style={{ height: "calc(var(--safe-bottom) + 8px)" }} />
        </DrawerContent>
      </Drawer>
    </>
  );
}
