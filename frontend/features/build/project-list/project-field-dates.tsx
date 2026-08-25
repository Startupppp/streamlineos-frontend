"use client";

import { useState, memo, useMemo } from "react";
import { format, parseISO, isValid } from "date-fns";
import { Calendar } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateProject } from "@/hooks/api/build";
import { InlineFieldWrapper } from "@/features/build/views/card-inline-fields";
import { resolveDatePickerYearBounds } from "@/lib/date-constraints";
import {
  dateToneClasses,
  resolveDateMeta,
} from "./project-card-utils";

function parseDateValue(
  value: string | Date | null | undefined,
): Date | undefined {
  if (!value) return undefined;
  const d = value instanceof Date ? value : parseISO(String(value));
  return isValid(d) ? d : undefined;
}

interface InlineProjectDatesProps {
  projectId: number;
  currentStartDate: string | Date | null;
  currentEndDate: string | Date | null;
  currentStatus: string;
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
  const dateMeta = resolveDateMeta(
    currentEndDate,
    currentStartDate,
    currentStatus,
  );
  const yearBounds = useMemo(() => resolveDatePickerYearBounds({ fromDate: startParsed }), [startParsed]);

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
              dateMeta
                ? dateToneClasses[dateMeta.tone]
                : "text-muted-foreground/60",
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
              <p className="mb-1.5 px-1 text-micro font-medium text-muted-foreground">
                Start
              </p>
              <CalendarComponent
                mode="single"
                selected={startParsed}
                onSelect={handleStartSelect}
                fromYear={yearBounds.fromYear}
                toYear={yearBounds.toYear}
                compact
              />
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
              <p className="mb-1.5 px-1 text-micro font-medium text-muted-foreground">
                End
              </p>
              <CalendarComponent
                mode="single"
                selected={endParsed}
                onSelect={handleEndSelect}
                fromYear={yearBounds.fromYear}
                toYear={yearBounds.toYear}
                compact
              />
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
