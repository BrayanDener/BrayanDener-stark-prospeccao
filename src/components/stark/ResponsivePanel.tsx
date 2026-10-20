import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useIsDesktop } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

interface ResponsivePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Conteúdo extra no cabeçalho (ex.: score). */
  headerAside?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/** Bottom sheet (Drawer) no celular, painel lateral (Sheet) no desktop. */
export function ResponsivePanel({ open, onOpenChange, title, description, headerAside, children, footer, className }: ResponsivePanelProps) {
  const isDesktop = useIsDesktop();

  const header = (Title: typeof SheetTitle | typeof DrawerTitle, Desc: typeof SheetDescription | typeof DrawerDescription) => (
    <div className="flex items-start gap-3 border-b border-border px-4 pb-4 pt-3 md:px-6 md:pt-6">
      <div className="min-w-0 flex-1 md:pr-10">
        <Title className="truncate text-xl leading-tight">{title}</Title>
        {description ? <Desc className="mt-1">{description}</Desc> : <Desc className="sr-only">Detalhes</Desc>}
      </div>
      {headerAside}
    </div>
  );

  const body = <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-6", className)}>{children}</div>;
  const foot = footer && (
    <div className="border-t border-border bg-surface px-4 py-3 md:px-6" style={{ paddingBottom: "calc(0.75rem + var(--safe-bottom))" }}>
      {footer}
    </div>
  );

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          {header(SheetTitle, SheetDescription)}
          {body}
          {foot}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[92dvh]">
        {header(DrawerTitle, DrawerDescription)}
        {body}
        {foot}
      </DrawerContent>
    </Drawer>
  );
}
