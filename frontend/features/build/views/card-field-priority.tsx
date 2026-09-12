"use client";

import { useState, memo } from "react";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { cn } from "@/lib/utils";
import { INLINE_POPOVER_MIN_CLASS } from "@/components/ui/field-control";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateTicket } from "@/hooks/api/build/tickets";
import { PriorityBadge } from "../shared/priority-badge";
import {
  popoverOptionBaseClass,
  popoverOptionSelectedClass,
} from "../shared/popover-option-classes";
import type { TicketPriority } from "@/types/projects";
import { AlertTriangle, ArrowUp, Minus, ArrowDown, Check } from "lucide-react";
import { InlineFieldWrapper } from "./card-field-wrapper";

const PRIORITIES: { value: TicketPriority; label: string; Icon: typeof Minus }[] = [
  { value: "URGENT", label: "Urgent", Icon: AlertTriangle },
  { value: "HIGH", label: "High", Icon: ArrowUp },
  { value: "MEDIUM", label: "Medium", Icon: Minus },
  { value: "LOW", label: "Low", Icon: ArrowDown },
];

interface InlinePriorityProps {
  ticketId: number;
  projectId: number;
  currentPriority?: string | null;
  showLabel?: boolean;
}

export const InlinePriority = memo(function InlinePriority({
  ticketId,
  projectId,
  currentPriority,
  showLabel = false,
}: InlinePriorityProps) {
  const [open, setOpen] = useState(false);
  const updateTicket = useUpdateTicket(projectId, {
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function makePriorityHandler(priority: TicketPriority) {
    return function selectPriority() {
      updateTicket.mutate({ ticketId, priority });
      setOpen(false);
    };
  }

  return (
    <InlineFieldWrapper>
      <ResponsivePopover open={open} onOpenChange={setOpen}>
        <ResponsivePopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex rounded p-0.5 hover:bg-muted/60 transition-colors"
            aria-label="Change priority"
          >
            <PriorityBadge
              priority={currentPriority}
              showLabel={showLabel}
              className={showLabel ? "bg-transparent px-0" : undefined}
            />
          </button>
        </ResponsivePopoverTrigger>
        <ResponsivePopoverContent
          title="Priority"
          className={cn("p-1", INLINE_POPOVER_MIN_CLASS, "min-w-36")}
          align="start"
        >
          {PRIORITIES.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={makePriorityHandler(value)}
              className={cn(
                popoverOptionBaseClass,
                currentPriority === value && popoverOptionSelectedClass,
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
              {currentPriority === value && <Check className="ml-auto h-3 w-3" />}
            </button>
          ))}
        </ResponsivePopoverContent>
      </ResponsivePopover>
    </InlineFieldWrapper>
  );
});
