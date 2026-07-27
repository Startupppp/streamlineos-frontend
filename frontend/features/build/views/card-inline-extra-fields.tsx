"use client";

import { useState, useEffect, memo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { INLINE_POPOVER_MIN_CLASS } from "@/components/ui/field-control";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateTicket, useAddLabelToTicket, useRemoveLabelFromTicket } from "@/hooks/api/build/tickets";
import { useProjectLabels } from "@/hooks/api/build/projects";
import { useSprints } from "@/hooks/api/build/sprints";
import { useCycles } from "@/hooks/api/build/advanced";
import { popoverOptionBaseClass, popoverOptionSelectedClass } from "../shared/popover-option-classes";
import { LabelsSearchCommand } from "../shared/labels-search-command";
import { typeConfig } from "../shared/types";
import { TicketTypeIcon } from "../shared/ticket-type-icon";
import { InlineFieldWrapper } from "./card-inline-fields";
import { Check, Tag, RefreshCw, Zap } from "lucide-react";
import type { TicketLabel } from "@/types/projects";

const INLINE_TYPES = ["TASK", "BUG", "STORY", "EPIC"] as const;

interface InlineTypeProps {
  ticketId: number;
  projectId: number;
  currentType?: string | null;
}

export const InlineType = memo(function InlineType({
  ticketId,
  projectId,
  currentType,
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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center rounded p-0.5 hover:bg-muted/60 transition-colors"
            aria-label="Change type"
          >
            <TicketTypeIcon type={currentType ?? "TASK"} size="sm" />
          </button>
        </PopoverTrigger>
        <PopoverContent className={cn("p-1", INLINE_POPOVER_MIN_CLASS, "min-w-32")} align="start">
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
        </PopoverContent>
      </Popover>
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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 rounded p-0.5 hover:bg-muted/60 transition-colors"
            aria-label="Edit labels"
          >
            <Tag
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                selectedIds.length > 0 ? "text-foreground" : "text-muted-foreground/50",
              )}
            />
            {selectedIds.length > 0 && (
              <span className="text-[9px] text-muted-foreground font-mono">{selectedIds.length}</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className={cn("p-1", INLINE_POPOVER_MIN_CLASS, "min-w-48")} align="start">
          <LabelsSearchCommand
            labels={labels}
            selectedIds={selectedIds}
            onToggle={handleLabelToggle}
            onCreated={handleLabelCreated}
            open={open}
          />
        </PopoverContent>
      </Popover>
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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted/60 transition-colors"
            aria-label="Change cycle"
          >
            <RefreshCw
              className={cn(
                "h-3 w-3 shrink-0",
                currentCycle ? "text-foreground" : "text-muted-foreground/50",
              )}
            />
            <span
              className={cn(
                "max-w-[60px] truncate text-[10px]",
                currentCycle ? "text-foreground" : "text-muted-foreground/50",
              )}
            >
              {currentCycle ? currentCycle.name : "No cycle"}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className={cn("p-1", INLINE_POPOVER_MIN_CLASS, "min-w-44")} align="start">
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
        </PopoverContent>
      </Popover>
    </InlineFieldWrapper>
  );
});

interface InlineSprintProps {
  ticketId: number;
  projectId: number;
  currentSprintId?: number | null;
}

export const InlineSprint = memo(function InlineSprint({
  ticketId,
  projectId,
  currentSprintId,
}: InlineSprintProps) {
  const [open, setOpen] = useState(false);
  const { data: allSprints = [] } = useSprints(projectId);
  const sprints = allSprints.filter((s) => s.status !== "COMPLETED");
  const updateTicket = useUpdateTicket(projectId, {
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const currentSprint = allSprints.find((s) => s.id === currentSprintId);

  function makeSprintHandler(sprintId: number | null) {
    return function selectSprint() {
      updateTicket.mutate({ ticketId, sprintId });
      setOpen(false);
    };
  }

  return (
    <InlineFieldWrapper>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted/60 transition-colors"
            aria-label="Change sprint"
          >
            <Zap className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span
              className={cn(
                "max-w-[60px] truncate text-[10px]",
                currentSprint ? "text-foreground" : "text-muted-foreground/50",
              )}
            >
              {currentSprint ? currentSprint.name : "No sprint"}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className={cn("p-1", INLINE_POPOVER_MIN_CLASS, "min-w-44")} align="start">
          <button
            type="button"
            onClick={makeSprintHandler(null)}
            className={cn(popoverOptionBaseClass, !currentSprintId && popoverOptionSelectedClass)}
          >
            <Zap className="h-3 w-3 shrink-0 text-muted-foreground" />
            No sprint
            {!currentSprintId && <Check className="ml-auto h-3 w-3" />}
          </button>
          {sprints.map((sprint) => (
            <button
              key={sprint.id}
              type="button"
              onClick={makeSprintHandler(sprint.id)}
              className={cn(
                popoverOptionBaseClass,
                currentSprintId === sprint.id && popoverOptionSelectedClass,
              )}
            >
              <Zap className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{sprint.name}</span>
              {currentSprintId === sprint.id && <Check className="ml-auto h-3 w-3 shrink-0" />}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </InlineFieldWrapper>
  );
});
