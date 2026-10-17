"use client";

import { useState, memo, useMemo } from "react";
import { format, parseISO, isValid } from "date-fns";
import { Calendar } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateProject } from "@/hooks/api/build/projects";
import { InlineFieldWrapper } from "@/features/build/views/card-field-wrapper";
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

  function handleClearStart() {
    updateProject.mutate({ projectId, startDate: null });
  }

  function handleClearEnd() {
    updateProject.mutate({ projectId, endDate: null });
  }

  function handleStartDateChange(value: string) {
    if (!value) handleClearStart();
    else updateProject.mutate({ projectId, startDate: value });
  }

  function handleEndDateChange(value: string) {
    if (!value) handleClearEnd();
    else updateProject.mutate({ projectId, endDate: value });
  }

  const triggerLabel = dateMeta?.label ?? "Set dates";

  return (
    <InlineFieldWrapper>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex shrink-0 items-center gap-0.5 text-micro font-medium transition-colors hover:opacity-80",
              dateMeta
                ? dateToneClasses[dateMeta.tone]
                : "text-muted-foreground",
            )}
            aria-label="Edit project dates"
          >
            <Calendar className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
            {triggerLabel}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 space-y-3 p-3" align="end">
          <DatePicker
            ariaLabel="Project start date"
            value={startParsed ? format(startParsed, "yyyy-MM-dd") : ""}
            onChange={handleStartDateChange}
            placeholder="Start"
            dateFormat="dd MMM yyyy"
            clearable
            fromYear={yearBounds.fromYear}
            toYear={yearBounds.toYear}
          />
          <DatePicker
            ariaLabel="Project end date"
            value={endParsed ? format(endParsed, "yyyy-MM-dd") : ""}
            onChange={handleEndDateChange}
            placeholder="End"
            dateFormat="dd MMM yyyy"
            clearable
            fromDate={startParsed}
            fromYear={yearBounds.fromYear}
            toYear={yearBounds.toYear}
          />
        </PopoverContent>
      </Popover>
    </InlineFieldWrapper>
  );
});
