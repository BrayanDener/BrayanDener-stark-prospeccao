import { LogOut, Search } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { Logo } from "@/components/stark/Logo";
import { LightLine } from "@/components/stark/LightLine";
import { Button } from "@/components/ui/button";
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from "@/config/nav";
import { cn } from "@/lib/utils";
import { useUI } from "@/store/ui-store";
import { useAuth } from "@/store/auth";

function SideLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        cn(
          "group relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-150",
          isActive ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:bg-surface-2/60 hover:text-foreground",
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span aria-hidden className="absolute -left-3 top-2 h-6 w-[2px] rounded-full bg-primary" />}
          <Icon className={cn("h-[18px] w-[18px]", isActive ? "text-primary" : "text-tertiary group-hover:text-muted-foreground")} aria-hidden />
          {item.label}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const { openWizard } = useUI();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-background/80 md:flex">
      <LightLine className="absolute inset-x-0 top-0" />
      <div className="px-6 pb-6 pt-7">
        <Logo />
      </div>
      <div className="px-3">
        <Button className="w-full justify-start" onClick={() => openWizard()}>
          <Search /> Nova busca
        </Button>
      </div>
      <nav aria-label="Navegação principal" className="mt-6 flex flex-1 flex-col gap-1 px-3">
        {PRIMARY_NAV.map((item) => (
          <SideLink key={item.to} item={item} />
        ))}
        <div className="mx-3 my-3 h-px bg-border" />
        {SECONDARY_NAV.map((item) => (
          <SideLink key={item.to} item={item} />
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={() => {
            void signOut().then(() => navigate("/login", { replace: true }));
          }}
          className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-2/60 hover:text-foreground"
        >
          <LogOut className="h-[18px] w-[18px] text-tertiary" aria-hidden /> Sair
        </button>
      </div>
    </aside>
  );
}
