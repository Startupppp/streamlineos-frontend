"use client";

import { Calendar } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { XIcon } from "@animateicons/react/lucide";
import {
  planningEndPickerProps,
  planningStartPickerProps,
} from "@/lib/date-constraints";

interface TicketDateFieldsProps {
  startDate: string | null | undefined;
  dueDate: string | null | undefined;
  onStartDateChange: (v: string) => void;
  onDueDateChange: (v: string) => void;
  onClearStartDate: () => void;
  onClearDueDate: () => void;
}

export function TicketDateFields({
  startDate,
  dueDate,
  onStartDateChange,
  onDueDateChange,
  onClearStartDate,
  onClearDueDate,
}: TicketDateFieldsProps) {
  const startDateBounds = planningStartPickerProps({ existingValue: startDate });
  const dueDateBounds = planningEndPickerProps({
    startDate,
    mode: "onOrAfter",
    existingValue: dueDate,
  });

  return (
    <div className="grid grid-cols-1 gap-3 @[18rem]:grid-cols-2">
      <div className="min-w-0">
        <span className="mb-1 block text-micro font-medium uppercase tracking-wide text-muted-foreground">
          <Calendar className="mr-0.5 inline h-3 w-3" />
          Start date
        </span>
        <div className="flex min-w-0 items-center gap-1">
          <DatePicker
            value={startDate ?? undefined}
            onChange={onStartDateChange}
            placeholder="Set start"
            fromDate={startDateBounds.fromDate}
            fromYear={startDateBounds.fromYear}
            toYear={startDateBounds.toYear}
            toDate={dueDate ? new Date(`${dueDate}T00:00:00`) : undefined}
            className="min-h-10 min-w-0 flex-1 touch-manipulation text-xs @[18rem]:min-h-9 md:min-h-9"
          />
          {startDate && (
            <AnimatedIconButton
              type="button"
              variant="ghost"
              size="icon"
              icon={XIcon}
              iconSize={14}
              onClick={onClearStartDate}
              className="h-10 w-10 shrink-0 touch-manipulation text-muted-foreground hover:text-destructive @[18rem]:h-8 @[18rem]:w-8 md:h-8 md:w-8"
              aria-label="Clear start date"
            />
          )}
        </div>
      </div>
      <div className="min-w-0">
        <span className="mb-1 block text-micro font-medium uppercase tracking-wide text-muted-foreground">
          <Calendar className="mr-0.5 inline h-3 w-3" />
          Due date
        </span>
        <div className="flex min-w-0 items-center gap-1">
          <DatePicker
            value={dueDate ?? undefined}
            onChange={onDueDateChange}
            placeholder="Set due"
            fromDate={dueDateBounds.fromDate}
            fromYear={dueDateBounds.fromYear}
            toYear={dueDateBounds.toYear}
            className="min-h-10 min-w-0 flex-1 touch-manipulation text-xs @[18rem]:min-h-9 md:min-h-9"
          />
          {dueDate && (
            <AnimatedIconButton
              type="button"
              variant="ghost"
              size="icon"
              icon={XIcon}
              iconSize={14}
              onClick={onClearDueDate}
              className="h-10 w-10 shrink-0 touch-manipulation text-muted-foreground hover:text-destructive @[18rem]:h-8 @[18rem]:w-8 md:h-8 md:w-8"
              aria-label="Clear due date"
            />
          )}
        </div>
      </div>
    </div>
  );
}
