"use client";

import { useState, useEffect, memo } from "react";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { cn } from "@/lib/utils";
import { INLINE_POPOVER_MIN_CLASS } from "@/components/ui/field-control";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateTicket, useAddLabelToTicket, useRemoveLabelFromTicket } from "@/hooks/api/build/tickets";
import { useProjectLabels } from "@/hooks/api/build/projects";
import { useCycles } from "@/hooks/api/build/advanced";
import { popoverOptionBaseClass, popoverOptionSelectedClass } from "../shared/popover-option-classes";
import { LabelsSearchCommand } from "../shared/labels-search-command";
import { typeConfig } from "../shared/types";
import { TicketTypeIcon } from "../shared/ticket-type-icon";
import { InlineFieldWrapper } from "./card-inline-fields";
import { Check, Tag, RefreshCw } from "lucide-react";
import type { TicketLabel } from "@/types/projects";
import { resolveLabelColor } from "@/components/labels/label-colors";

const INLINE_TYPES = ["TASK", "BUG", "STORY", "EPIC"] as const;

const TYPE_PILL_CLASS: Record<string, string> = {
  BUG: "bg-status-info-surface text-status-info-ink",
  TASK: "bg-muted text-muted-foreground",
  STORY: "bg-status-success-surface text-status-success-ink",
  EPIC: "bg-category-orange-surface text-category-orange-ink",
  SUBTASK: "bg-muted text-muted-foreground",
};

interface InlineTypeProps {
  ticketId: number;
  projectId: number;
  currentType?: string | null;
  showLabel?: boolean;
}

export const InlineType = memo(function InlineType({
  ticketId,
  projectId,
  currentType,
  showLabel = false,
}: InlineTypeProps) {
  const [open, setOpen] = useState(false);
  const updateTicket = useUpdateTicket(projectId, {
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function makeTypeHandler(type: string) {
    return function selectType() {
      updateTicket.mutate({ ticketId, type });
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

interface InlineLabelsProps {
  ticketId: number;
  projectId: number;
  currentLabelIds?: number[];
}

export const InlineLabels = memo(function InlineLabels({
  ticketId,
  projectId,
  currentLabelIds = [],
}: InlineLabelsProps) {
  const [open, setOpen] = useState(false);
  const [optimisticIds, setOptimisticIds] = useState<number[] | null>(null);
  const { data: labels = [] } = useProjectLabels(projectId);
  const currentIdsKey = currentLabelIds.join(",");

  useEffect(() => {
    setOptimisticIds(null);
  }, [currentIdsKey]);

  const selectedIds = optimisticIds ?? currentLabelIds;
  const selectedLabels = labels.filter((label) => selectedIds.includes(label.id));

  const addLabel = useAddLabelToTicket({
    onError: (e) => {
      setOptimisticIds(null);
      toast.error(getErrorMessage(e));
    },
  });
  const removeLabel = useRemoveLabelFromTicket({
    onError: (e) => {
      setOptimisticIds(null);
      toast.error(getErrorMessage(e));
    },
  });

  function handleLabelToggle(labelId: number) {
    const next = selectedIds.includes(labelId)
      ? selectedIds.filter((id) => id !== labelId)
      : [...selectedIds, labelId];
    setOptimisticIds(next);
    if (selectedIds.includes(labelId)) {
      removeLabel.mutate({ ticketId, projectId, labelId });
    } else {
      addLabel.mutate({ ticketId, projectId, labelId });
    }
  }

  function handleLabelCreated(label: TicketLabel) {
    if (selectedIds.includes(label.id)) return;
    setOptimisticIds([...selectedIds, label.id]);
    addLabel.mutate({ ticketId, projectId, labelId: label.id });
  }

  return (
    <InlineFieldWrapper>
      <ResponsivePopover open={open} onOpenChange={setOpen}>
        <ResponsivePopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex max-w-full items-center gap-1 rounded p-0.5 hover:bg-muted/60 transition-colors"
            aria-label="Edit labels"
          >
            {selectedLabels.length > 0 ? (
              <span className="flex min-w-0 flex-wrap items-center gap-1">
                {selectedLabels.slice(0, 2).map((label) => (
                  <span
                    key={label.id}
                    className="max-w-[7.5rem] truncate rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                    style={{
                      backgroundColor: `${resolveLabelColor(label.color)}1a`,
                      color: resolveLabelColor(label.color),
                    }}
                  >
                    {label.name}
                  </span>
                ))}
                {selectedLabels.length > 2 ? (
                  <span className="text-xs text-muted-foreground">
                    +{selectedLabels.length - 2}
                  </span>
                ) : null}
              </span>
            ) : (
              <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
          </button>
        </ResponsivePopoverTrigger>
        <ResponsivePopoverContent title="Labels" className={cn("p-1", INLINE_POPOVER_MIN_CLASS, "min-w-48")} align="start">
          <LabelsSearchCommand
            labels={labels}
            selectedIds={selectedIds}
            onToggle={handleLabelToggle}
            onCreated={handleLabelCreated}
            open={open}
          />
        </ResponsivePopoverContent>
      </ResponsivePopover>
    </InlineFieldWrapper>
  );
});

interface InlineCycleProps {
  ticketId: number;
  projectId: number;
  currentCycleId?: number | null;
}

export const InlineCycle = memo(function InlineCycle({
  ticketId,
  projectId,
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
      updateTicket.mutate({ ticketId, cycleId });
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
