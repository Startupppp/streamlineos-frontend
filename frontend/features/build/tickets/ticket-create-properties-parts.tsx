"use client";

import { forwardRef } from "react";
import { AlertTriangle, ArrowUp, Minus, ArrowDown } from "lucide-react";
import { XIcon } from "@animateicons/react/lucide";
import { cn } from "@/lib/utils";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { TicketPriority } from "@/types/projects";

export const PRIORITIES: { value: TicketPriority; label: string; Icon: typeof Minus }[] = [
  { value: "URGENT", label: "Urgent", Icon: AlertTriangle },
  { value: "HIGH", label: "High", Icon: ArrowUp },
  { value: "MEDIUM", label: "Medium", Icon: Minus },
  { value: "LOW", label: "Low", Icon: ArrowDown },
];

export function RemoveLabelChipButton({
  labelId,
  labelName,
  onRemove,
}: {
  labelId: number;
  labelName: string;
  onRemove: (id: number) => () => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button
      type="button"
      onClick={onRemove(labelId)}
      aria-label={`Remove ${labelName}`}
      className="inline-flex size-3 shrink-0 items-center justify-center leading-none hover:text-destructive transition-colors"
      {...hoverHandlers}
    >
      <XIcon ref={iconRef} size={10} className="shrink-0" />
    </button>
  );
}

export const PillButton = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button"> & { label: string }
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
