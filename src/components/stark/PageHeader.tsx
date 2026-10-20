import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 pb-5 pt-2 md:flex-row md:items-end md:justify-between md:pb-6 md:pt-8", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-sm text-muted-foreground">{eyebrow}</div>}
        <h1 className="font-display text-2xl font-bold tracking-tighter md:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
