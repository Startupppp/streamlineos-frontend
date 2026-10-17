import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { AlertTriangle, ArrowUp, Minus, ArrowDown } from "lucide-react";
import type { TicketPriority } from "@/types/projects";
import { cn } from "@/lib/utils";

export const PRIORITIES: { value: TicketPriority; label: string; Icon: typeof Minus }[] = [
  { value: "URGENT", label: "Urgent", Icon: AlertTriangle },
  { value: "HIGH", label: "High", Icon: ArrowUp },
  { value: "MEDIUM", label: "Medium", Icon: Minus },
  { value: "LOW", label: "Low", Icon: ArrowDown },
];

export const PillButton = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<"button"> & { label: string }
>(function PillButton({ children, className, label, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted/80",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
