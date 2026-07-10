"use client";

import { useState, memo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateTicket, useAddLabelToTicket, useRemoveLabelFromTicket } from "@/hooks/api/projects/tickets";
import { useProjectLabels } from "@/hooks/api/projects/projects";
import { useSprints } from "@/hooks/api/projects/sprints";
import { useCycles } from "@/hooks/api/projects/advanced";
import { popoverOptionBaseClass, popoverOptionSelectedClass } from "../shared/popover-option-classes";
import { typeConfig } from "../shared/types";
import { TicketTypeIcon } from "../shared/ticket-type-icon";
import { InlineFieldWrapper } from "./card-inline-fields";
import { Check, Tag, RotateCcw, Zap } from "lucide-react";

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
        <PopoverContent className="w-32 p-1" align="start">
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
  const { data: labels = [] } = useProjectLabels(projectId);
  const addLabel = useAddLabelToTicket({
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const removeLabel = useRemoveLabelFromTicket({
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function makeLabelToggleHandler(labelId: number) {
    return function toggleLabel() {
      if (currentLabelIds.includes(labelId)) {
        removeLabel.mutate({ ticketId, projectId, labelId });
      } else {
        addLabel.mutate({ ticketId, projectId, labelId });
      }
    };
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
                currentLabelIds.length > 0 ? "text-foreground" : "text-muted-foreground/50",
              )}
            />
            {currentLabelIds.length > 0 && (
              <span className="text-[9px] text-muted-foreground font-mono">{currentLabelIds.length}</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1" align="start">
          {labels.length === 0 && (
            <p className="py-2 text-center text-xs text-muted-foreground">No labels</p>
          )}
          {labels.map((label) => {
            const active = currentLabelIds.includes(label.id);
            return (
              <button
                key={label.id}
                type="button"
                onClick={makeLabelToggleHandler(label.id)}
                className={cn(popoverOptionBaseClass, active && popoverOptionSelectedClass)}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0 border border-border"
                  style={{ backgroundColor: label.color ?? undefined }}
                />
                <span className="truncate">{label.name}</span>
                {active && <Check className="ml-auto h-3 w-3 shrink-0" />}
              </button>
            );
          })}
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
            <RotateCcw className="h-3 w-3 shrink-0 text-muted-foreground" />
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
        <PopoverContent className="w-44 p-1" align="start">
          <button
            type="button"
            onClick={makeCycleHandler(null)}
            className={cn(popoverOptionBaseClass, !currentCycleId && popoverOptionSelectedClass)}
          >
            <RotateCcw className="h-3 w-3 shrink-0 text-muted-foreground" />
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
              <RotateCcw className="h-3 w-3 shrink-0 text-muted-foreground" />
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
        <PopoverContent className="w-44 p-1" align="start">
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
