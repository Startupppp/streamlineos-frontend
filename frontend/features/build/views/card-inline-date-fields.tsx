"use client";

import { useState, memo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FIELD_DATE_POPOVER_CONTENT_CLASS } from "@/components/ui/field-control";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateTicket } from "@/hooks/api/build/tickets";
import { InlineFieldWrapper } from "./card-inline-fields";
import { format, parseISO, isValid } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

interface InlineDueDateProps {
  ticketId: number;
  projectId: number;
  currentDueDate?: string | null;
  fallbackDate?: string | null;
}

export const InlineDueDate = memo(function InlineDueDate({
  ticketId,
  projectId,
  currentDueDate,
  fallbackDate,
}: InlineDueDateProps) {
  const [open, setOpen] = useState(false);
  const updateTicket = useUpdateTicket(projectId, {
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const parsedDate = currentDueDate
    ? (() => {
        const d = parseISO(currentDueDate);
        return isValid(d) ? d : undefined;
      })()
    : undefined;

  const fallbackParsed = !parsedDate && fallbackDate
    ? (() => {
        const d = parseISO(fallbackDate);
        return isValid(d) ? d : undefined;
      })()
    : undefined;

  const displayDate = parsedDate ?? fallbackParsed;

  function handleDateSelect(date: Date | undefined) {
    if (date) {
      updateTicket.mutate({ ticketId, dueDate: format(date, "yyyy-MM-dd") });
      setOpen(false);
    }
  }

  function handleClear() {
    updateTicket.mutate({ ticketId, dueDate: null });
    setOpen(false);
  }

  return (
    <InlineFieldWrapper>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted/60 transition-colors"
            aria-label="Set due date"
          >
            <CalendarIcon
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                displayDate ? "text-muted-foreground" : "text-muted-foreground/50",
              )}
            />
            <span
              className={cn(
                "text-xs",
                displayDate ? "text-muted-foreground" : "text-muted-foreground/50",
              )}
            >
              {displayDate ? format(displayDate, "MMM d, yyyy") : "Due date"}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className={cn(FIELD_DATE_POPOVER_CONTENT_CLASS, "p-0")} align="start">
          <Calendar
            mode="single"
            selected={parsedDate}
            onSelect={handleDateSelect}
            compact
          />
          {parsedDate && (
            <div className="border-t border-border px-2 pb-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={handleClear}
              >
                Clear due date
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </InlineFieldWrapper>
  );
});

interface InlineStartDateProps {
  ticketId: number;
  projectId: number;
  currentStartDate?: string | null;
}

export const InlineStartDate = memo(function InlineStartDate({
  ticketId,
  projectId,
  currentStartDate,
}: InlineStartDateProps) {
  const [open, setOpen] = useState(false);
  const updateTicket = useUpdateTicket(projectId, {
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const parsedDate = currentStartDate
    ? (() => {
        const d = parseISO(currentStartDate);
        return isValid(d) ? d : undefined;
      })()
    : undefined;

  function handleDateSelect(date: Date | undefined) {
    if (date) {
      updateTicket.mutate({ ticketId, startDate: format(date, "yyyy-MM-dd") });
      setOpen(false);
    }
  }

  function handleClear() {
    updateTicket.mutate({ ticketId, startDate: null });
    setOpen(false);
  }

  return (
    <InlineFieldWrapper>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted/60 transition-colors"
            aria-label="Set start date"
          >
            <CalendarIcon
              className={cn(
                "h-3 w-3 shrink-0",
                parsedDate ? "text-foreground" : "text-muted-foreground/50",
              )}
            />
            <span
              className={cn(
                "text-micro",
                parsedDate ? "text-foreground" : "text-muted-foreground/50",
              )}
            >
              {parsedDate ? format(parsedDate, "MMM d") : "Start date"}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className={cn(FIELD_DATE_POPOVER_CONTENT_CLASS, "p-0")} align="start">
          <Calendar
            mode="single"
            selected={parsedDate}
            onSelect={handleDateSelect}
            compact
          />
          {parsedDate && (
            <div className="border-t border-border px-2 pb-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={handleClear}
              >
                Clear start date
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </InlineFieldWrapper>
  );
});
