import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = (props: ToasterProps) => (
  <Sonner
    theme="dark"
    position="top-center"
    offset={16}
    className="toaster group"
    toastOptions={{
      classNames: {
        toast:
          "group toast !rounded-lg !border !border-border-strong !bg-surface-2 !text-foreground !shadow-xl !font-sans",
        description: "!text-muted-foreground",
        actionButton: "!bg-primary-solid !text-primary-foreground",
        cancelButton: "!bg-surface !text-muted-foreground",
        success: "[&_[data-icon]]:!text-success",
        error: "[&_[data-icon]]:!text-danger",
      },
    }}
    {...props}
  />
);

export { Toaster };
