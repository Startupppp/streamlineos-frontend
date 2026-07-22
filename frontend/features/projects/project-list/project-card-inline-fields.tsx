"use client";

import { useState, memo } from "react";
import { format, parseISO, isValid } from "date-fns";
import { Check, Calendar } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateProject } from "@/hooks/api/projects";
import {
  getColorSafe,
  projectStatusColors,
  projectStatusDisplayLabels,
} from "@/lib/theme-constants";
import { popoverOptionBaseClass, popoverOptionSelectedClass } from "@/features/projects/shared/popover-option-classes";
import { TEXT_ONE_LINE, TEXT_TWO_LINES } from "@/features/projects/shared/text-overflow";
import { InlineFieldWrapper } from "@/features/projects/views/card-inline-fields";
import { dateToneClasses, resolveDateMeta, statusDotColors } from "./project-card-utils";
import type { ProjectStatusValue } from "@/types/projects";

const PROJECT_STATUSES: ProjectStatusValue[] = ["ACTIVE", "COMPLETED", "ARCHIVED"];

interface InlineProjectFieldProps {
  projectId: number;
}

interface InlineProjectTitleProps extends InlineProjectFieldProps {
  currentName: string;
}

export const InlineProjectTitle = memo(function InlineProjectTitle({
  projectId,
  currentName,
}: InlineProjectTitleProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentName);
  const updateProject = useUpdateProject({
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function handleOpen(next: boolean) {
    if (next) setValue(currentName);
    setOpen(next);
  }

  function handleSave() {
    const trimmed = value.trim();
    if (trimmed.length < 2 || trimmed === currentName) {
      setOpen(false);
      return;
    }
    updateProject.mutate({ projectId, name: trimmed }, { onSuccess: () => setOpen(false) });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") setOpen(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value);
  }

  return (
    <InlineFieldWrapper>
      <Popover open={open} onOpenChange={handleOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn("w-full text-left text-[13px] font-semibold text-foreground transition-colors hover:text-primary", TEXT_ONE_LINE)}
            aria-label="Edit project name"
            title={currentName}
          >
            {currentName}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <Input
            autoFocus
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="text-sm"
            placeholder="Project name"
          />
          <LoadingButton
            size="sm"
            className="mt-2 w-full"
            isPending={updateProject.isPending}
            loadingText="Saving…"
            onClick={handleSave}
            disabled={value.trim().length < 2}
          >
            Save
          </LoadingButton>
        </PopoverContent>
      </Popover>
    </InlineFieldWrapper>
  );
});

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
  const displayLabel = projectStatusDisplayLabels[currentStatus] ?? currentStatus;
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
                "gap-0.5 rounded-full border-0 px-1.5 py-0 text-[8px] font-semibold uppercase tracking-wide",
                "cursor-pointer transition-opacity hover:opacity-80",
                statusColor,
              )}
            >
              <span className={cn("h-1 w-1 shrink-0 rounded-full", statusDot)} aria-hidden="true" />
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
                {status === currentStatus && <Check className="ml-auto h-3 w-3" />}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
    </InlineFieldWrapper>
  );
});

interface InlineProjectDescriptionProps extends InlineProjectFieldProps {
  currentDescription: string | null;
}

export const InlineProjectDescription = memo(function InlineProjectDescription({
  projectId,
  currentDescription,
}: InlineProjectDescriptionProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentDescription ?? "");
  const updateProject = useUpdateProject({
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function handleOpen(next: boolean) {
    if (next) setValue(currentDescription ?? "");
    setOpen(next);
  }

  function handleSave() {
    const trimmed = value.trim();
    if (trimmed === (currentDescription ?? "")) {
      setOpen(false);
      return;
    }
    updateProject.mutate(
      { projectId, description: trimmed || undefined },
      { onSuccess: () => setOpen(false) },
    );
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
  }

  const preview = currentDescription?.trim();

  return (
    <InlineFieldWrapper>
      <Popover open={open} onOpenChange={handleOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              TEXT_TWO_LINES,
              "mt-1 flex-1 text-left text-[10px] transition-colors",
              preview
                ? "text-muted-foreground hover:text-foreground"
                : "text-muted-foreground/50 hover:text-muted-foreground",
            )}
            aria-label="Edit project description"
            title={preview || undefined}
          >
            {preview || "Add description…"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <Textarea
            autoFocus
            value={value}
            onChange={handleChange}
            placeholder="What is this project about?"
            className="min-h-[72px] resize-none text-xs"
            rows={3}
          />
          <LoadingButton
            size="sm"
            className="mt-2 w-full"
            isPending={updateProject.isPending}
            loadingText="Saving…"
            onClick={handleSave}
          >
            Save
          </LoadingButton>
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
  URGENT: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-slate-400",
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

  const dotColor = currentPriority ? priorityDotColors[currentPriority] : "bg-muted-foreground/30";
  const label = currentPriority
    ? (PRIORITY_OPTIONS.find((o) => o.value === currentPriority)?.label ?? currentPriority)
    : "No priority";

  return (
    <InlineFieldWrapper>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Change project priority"
          >
            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotColor)} aria-hidden="true" />
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
              <span className={cn("h-2 w-2 rounded-full shrink-0", priorityDotColors[option.value])} />
              {option.label}
              {option.value === currentPriority && <Check className="ml-auto h-3 w-3" />}
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

interface InlineProjectDatesProps extends InlineProjectFieldProps {
  currentStartDate: string | Date | null;
  currentEndDate: string | Date | null;
  currentStatus: string;
}

function parseDateValue(value: string | Date | null | undefined): Date | undefined {
  if (!value) return undefined;
  const d = value instanceof Date ? value : parseISO(String(value));
  return isValid(d) ? d : undefined;
}

export const InlineProjectDates = memo(function InlineProjectDates({
  projectId,
  currentStartDate,
  currentEndDate,
  currentStatus,
}: InlineProjectDatesProps) {
  const [open, setOpen] = useState(false);
  const updateProject = useUpdateProject({
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const startParsed = parseDateValue(currentStartDate);
  const endParsed = parseDateValue(currentEndDate);
  const dateMeta = resolveDateMeta(currentEndDate, currentStartDate, currentStatus);

  function handleStartSelect(date: Date | undefined) {
    if (!date) return;
    updateProject.mutate({ projectId, startDate: format(date, "yyyy-MM-dd") });
  }

  function handleEndSelect(date: Date | undefined) {
    if (!date) return;
    updateProject.mutate({ projectId, endDate: format(date, "yyyy-MM-dd") });
  }

  function handleClearStart() {
    updateProject.mutate({ projectId, startDate: null });
  }

  function handleClearEnd() {
    updateProject.mutate({ projectId, endDate: null });
  }

  const triggerLabel = dateMeta?.label ?? "Set dates";

  return (
    <InlineFieldWrapper>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex shrink-0 items-center gap-0.5 text-[9px] font-medium transition-colors hover:opacity-80",
              dateMeta ? dateToneClasses[dateMeta.tone] : "text-muted-foreground/60",
            )}
            aria-label="Edit project dates"
          >
            <Calendar className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
            {triggerLabel}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="flex divide-x divide-border">
            <div className="p-2">
              <p className="mb-1.5 px-1 text-[10px] font-medium text-muted-foreground">Start</p>
              <CalendarComponent mode="single" selected={startParsed} onSelect={handleStartSelect} compact />
              {startParsed && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-7 w-full text-xs text-muted-foreground"
                  onClick={handleClearStart}
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="p-2">
              <p className="mb-1.5 px-1 text-[10px] font-medium text-muted-foreground">End</p>
              <CalendarComponent mode="single" selected={endParsed} onSelect={handleEndSelect} compact />
              {endParsed && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-7 w-full text-xs text-muted-foreground"
                  onClick={handleClearEnd}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </InlineFieldWrapper>
  );
});
