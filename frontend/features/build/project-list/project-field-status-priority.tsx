"use client";

import { useState, memo } from "react";
import { Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateProject } from "@/hooks/api/build";
import {
  getColorSafe,
  projectStatusColors,
  projectStatusDisplayLabels,
} from "@/lib/theme-constants";
import {
  popoverOptionBaseClass,
  popoverOptionSelectedClass,
} from "@/features/build/shared/popover-option-classes";
import { InlineFieldWrapper } from "@/features/build/views/card-inline-fields";
import { statusDotColors } from "./project-card-utils";
import type { ProjectStatusValue } from "@/types/projects";

const PROJECT_STATUSES: ProjectStatusValue[] = [
  "ACTIVE",
  "COMPLETED",
  "ARCHIVED",
];

interface InlineProjectFieldProps {
  projectId: number;
}

interface InlineProjectStatusProps extends InlineProjectFieldProps {
  currentStatus: string;
}

export const InlineProjectStatus = memo(function InlineProjectStatus({
  projectId,
  currentStatus,
}: InlineProjectStatusProps) {
  const [open, setOpen] = useState(false);
  const updateProject = useUpdateProject({
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const displayLabel =
    projectStatusDisplayLabels[currentStatus] ?? currentStatus;
  const statusColor = getColorSafe(projectStatusColors, currentStatus);
  const statusDot = getColorSafe(statusDotColors, currentStatus);

  function makeStatusHandler(status: ProjectStatusValue) {
    return function selectStatus() {
      updateProject.mutate({ projectId, status });
      setOpen(false);
    };
  }

  return (
    <InlineFieldWrapper>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" aria-label="Change project status">
            <Badge
              variant="secondary"
              className={cn(
                "gap-0.5 rounded-full border-0 px-1.5 py-0 text-micro font-semibold uppercase tracking-wide",
                "cursor-pointer transition-opacity hover:opacity-80",
                statusColor,
              )}
            >
              <span
                className={cn("h-1 w-1 shrink-0 rounded-full", statusDot)}
                aria-hidden="true"
              />
              {displayLabel}
            </Badge>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1" align="start">
          {PROJECT_STATUSES.map((status) => {
            const label = projectStatusDisplayLabels[status] ?? status;
            const dot = getColorSafe(statusDotColors, status);
            return (
              <button
                key={status}
                type="button"
                onClick={makeStatusHandler(status)}
                className={cn(
                  popoverOptionBaseClass,
                  status === currentStatus && popoverOptionSelectedClass,
                )}
              >
                <span className={cn("h-2 w-2 rounded-full shrink-0", dot)} />
                {label}
                {status === currentStatus && (
                  <Check className="ml-auto h-3 w-3" />
                )}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
    </InlineFieldWrapper>
  );
});

type ProjectPriorityValue = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

const PRIORITY_OPTIONS: { value: ProjectPriorityValue; label: string }[] = [
  { value: "URGENT", label: "Urgent" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

const priorityDotColors: Record<ProjectPriorityValue, string> = {
  URGENT: "bg-status-danger-fill",
  HIGH: "bg-status-warning-fill",
  MEDIUM: "bg-status-warning-fill",
  LOW: "bg-status-neutral-fill",
};

interface InlineProjectPriorityProps extends InlineProjectFieldProps {
  currentPriority: ProjectPriorityValue | null;
}

export const InlineProjectPriority = memo(function InlineProjectPriority({
  projectId,
  currentPriority,
}: InlineProjectPriorityProps) {
  const [open, setOpen] = useState(false);
  const updateProject = useUpdateProject({
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function makePriorityHandler(priority: ProjectPriorityValue) {
    return function selectPriority() {
      updateProject.mutate({ projectId, priority });
      setOpen(false);
    };
  }

  function handleClear() {
    updateProject.mutate({ projectId, priority: undefined });
    setOpen(false);
  }

  const dotColor = currentPriority
    ? priorityDotColors[currentPriority]
    : "bg-muted-foreground/30";
  const label = currentPriority
    ? (PRIORITY_OPTIONS.find((o) => o.value === currentPriority)?.label ??
      currentPriority)
    : "No priority";

  return (
    <InlineFieldWrapper>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1 text-dense text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Change project priority"
          >
            <span
              className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotColor)}
              aria-hidden="true"
            />
            {label}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-36 p-1" align="start">
          {PRIORITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={makePriorityHandler(option.value)}
              className={cn(
                popoverOptionBaseClass,
                option.value === currentPriority && popoverOptionSelectedClass,
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  priorityDotColors[option.value],
                )}
              />
              {option.label}
              {option.value === currentPriority && (
                <Check className="ml-auto h-3 w-3" />
              )}
            </button>
          ))}
          {currentPriority ? (
            <>
              <div className="my-0.5 border-t border-border" />
              <button
                type="button"
                onClick={handleClear}
                className={popoverOptionBaseClass}
              >
                Clear priority
              </button>
            </>
          ) : null}
        </PopoverContent>
      </Popover>
    </InlineFieldWrapper>
  );
});
