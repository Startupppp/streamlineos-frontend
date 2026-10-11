"use client";

import { memo, useCallback } from "react";
import { format, parseISO, isValid } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateTicket } from "@/hooks/api/build/tickets";
import { InlineFieldWrapper } from "./card-field-wrapper";

function formatStoredDate(value: string | null | undefined, pattern: string): string | undefined {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, pattern) : undefined;
}

interface InlineDueDateProps {
  ticketId: number;
  projectId: number;
  version: number;
  currentDueDate?: string | null;
  fallbackDate?: string | null;
  hideEmpty?: boolean;
}

export const InlineDueDate = memo(function InlineDueDate({
  ticketId,
  projectId,
  version,
  currentDueDate,
  fallbackDate,
  hideEmpty = false,
}: InlineDueDateProps) {
  const updateTicket = useUpdateTicket(projectId, {
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const handleChange = useCallback(
    (value: string) => {
      updateTicket.mutate({ ticketId, version, dueDate: value || null });
    },
    [ticketId, updateTicket, version],
  );

  if (hideEmpty && !currentDueDate) return null;

  return (
    <InlineFieldWrapper>
      <DatePicker
        ariaLabel="Set due date"
        value={currentDueDate ?? ""}
        onChange={handleChange}
        placeholder={formatStoredDate(fallbackDate, "MMM d, yyyy") ?? "Due date"}
        dateFormat="MMM d, yyyy"
        clearable
        className="w-auto"
      />
    </InlineFieldWrapper>
  );
});

interface InlineStartDateProps {
  ticketId: number;
  projectId: number;
  version: number;
  currentStartDate?: string | null;
}

export const InlineStartDate = memo(function InlineStartDate({
  ticketId,
  projectId,
  version,
  currentStartDate,
}: InlineStartDateProps) {
  const updateTicket = useUpdateTicket(projectId, {
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const handleChange = useCallback(
    (value: string) => {
      updateTicket.mutate({ ticketId, version, startDate: value || null });
    },
    [ticketId, updateTicket, version],
  );

  return (
    <InlineFieldWrapper>
      <DatePicker
        ariaLabel="Set start date"
        value={currentStartDate ?? ""}
        onChange={handleChange}
        placeholder="Start date"
        dateFormat="MMM d"
        clearable
        className="w-auto"
      />
    </InlineFieldWrapper>
  );
});
