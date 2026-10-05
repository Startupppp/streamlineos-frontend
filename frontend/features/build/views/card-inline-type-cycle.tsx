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
import { useCycles } from "@/hooks/api/build/cycles";
import { popoverOptionBaseClass, popoverOptionSelectedClass } from "../shared/popover-option-classes";
import { typeConfig } from "../shared/types";
import { TicketTypeIcon } from "../shared/ticket-type-icon";
import { InlineFieldWrapper } from "./card-field-wrapper";
import { Check, RefreshCw } from "lucide-react";

const INLINE_TYPES = ["TASK", "BUG", "STORY", "EPIC"] as const;

const TYPE_PILL_CLASS: Record<string, string> = {
  BUG: "bg-status-info-surface text-status-info-ink-strong",
  TASK: "bg-muted text-muted-foreground",
  STORY: "bg-status-success-surface text-status-success-ink-strong",
  EPIC: "bg-category-orange-surface text-category-orange-ink",
  SUBTASK: "bg-muted text-muted-foreground",
};

interface InlineTypeProps {
  ticketId: number;
  projectId: number;
  version: number;
  currentType?: string | null;
  showLabel?: boolean;
}

export const InlineType = memo(function InlineType({
  ticketId,
  projectId,
  version,
  currentType,
  showLabel = false,
}: InlineTypeProps) {
  const [open, setOpen] = useState(false);
  const updateTicket = useUpdateTicket(projectId, {
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function makeTypeHandler(type: string) {
    return function selectType() {
      updateTicket.mutate({ ticketId, version, type });
      setOpen(false);
    };
  }

  return (
    <InlineFieldWrapper>
      <ResponsivePopover open={open} onOpenChange={setOpen}>
        <ResponsivePopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center rounded p-0.5 hover:bg-muted/60 transition-colors",
              showLabel &&
                cn(
                  "gap-1 rounded-full px-2 py-0.5 text-xs font-medium hover:opacity-90",
                  TYPE_PILL_CLASS[currentType ?? "TASK"] ?? TYPE_PILL_CLASS.TASK,
                ),
            )}
            aria-label="Change type"
          >
            {showLabel ? (
              typeConfig[currentType ?? "TASK"]?.label ?? currentType ?? "Task"
            ) : (
              <TicketTypeIcon type={currentType ?? "TASK"} size="sm" />
            )}
          </button>
        </ResponsivePopoverTrigger>
        <ResponsivePopoverContent title="Type" className={cn("p-1", INLINE_POPOVER_MIN_CLASS, "min-w-32")} align="start">
          {INLINE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={makeTypeHandler(t)}
              className={cn(
                popoverOptionBaseClass,
                currentType === t && popoverOptionSelectedClass,
              )}
            >
              <TicketTypeIcon type={t} size="sm" />
              {typeConfig[t]?.label ?? t}
              {currentType === t && <Check className="ml-auto h-3 w-3" />}
            </button>
          ))}
        </ResponsivePopoverContent>
      </ResponsivePopover>
    </InlineFieldWrapper>
  );
});

interface InlineCycleProps {
  ticketId: number;
  projectId: number;
  version: number;
  currentCycleId?: number | null;
}

export const InlineCycle = memo(function InlineCycle({
  ticketId,
  projectId,
  version,
  currentCycleId,
}: InlineCycleProps) {
  const [open, setOpen] = useState(false);
  const { data: cycles = [] } = useCycles(projectId);
  const updateTicket = useUpdateTicket(projectId, {
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const currentCycle = cycles.find((c) => c.id === currentCycleId);

  function makeCycleHandler(cycleId: number | null) {
    return function selectCycle() {
      updateTicket.mutate({ ticketId, version, cycleId });
      setOpen(false);
    };
  }

  return (
    <InlineFieldWrapper>
      <ResponsivePopover open={open} onOpenChange={setOpen}>
        <ResponsivePopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted/60 transition-colors"
            aria-label="Change cycle"
          >
            <RefreshCw
              className={cn(
                "h-3 w-3 shrink-0",
                currentCycle ? "text-foreground" : "text-muted-foreground",
              )}
            />
            <span
              className={cn(
                "max-w-[60px] truncate text-micro",
                currentCycle ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {currentCycle ? currentCycle.name : "No cycle"}
            </span>
          </button>
        </ResponsivePopoverTrigger>
        <ResponsivePopoverContent title="Cycle" className={cn("p-1", INLINE_POPOVER_MIN_CLASS, "min-w-44")} align="start">
          <button
            type="button"
            onClick={makeCycleHandler(null)}
            className={cn(popoverOptionBaseClass, !currentCycleId && popoverOptionSelectedClass)}
          >
            <RefreshCw className="h-3 w-3 shrink-0 text-muted-foreground" />
            No cycle
            {!currentCycleId && <Check className="ml-auto h-3 w-3" />}
          </button>
          {cycles.map((cycle) => (
            <button
              key={cycle.id}
              type="button"
              onClick={makeCycleHandler(cycle.id)}
              className={cn(
                popoverOptionBaseClass,
                currentCycleId === cycle.id && popoverOptionSelectedClass,
              )}
            >
              <RefreshCw className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{cycle.name}</span>
              {currentCycleId === cycle.id && <Check className="ml-auto h-3 w-3 shrink-0" />}
            </button>
          ))}
        </ResponsivePopoverContent>
      </ResponsivePopover>
    </InlineFieldWrapper>
  );
});
