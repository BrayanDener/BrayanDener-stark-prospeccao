import { Link } from "react-router-dom";
import { Logo } from "@/components/stark/Logo";
import { LightLine } from "@/components/stark/LightLine";

export function MobileHeader() {
  return (
    <header className="relative md:hidden" style={{ paddingTop: "var(--safe-top)" }}>
      <LightLine className="absolute inset-x-0 top-0" />
      <div className="flex h-14 items-center px-4">
        <Link to="/" aria-label="Início" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Logo />
        </Link>
      </div>
    </header>
  );
}
