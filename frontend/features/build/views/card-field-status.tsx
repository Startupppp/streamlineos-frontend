"use client";

import { useState, memo } from "react";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { cn } from "@/lib/utils";
import { INLINE_POPOVER_MIN_CLASS } from "@/components/ui/field-control";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateTicket } from "@/hooks/api/build/tickets";
import {
  popoverOptionBaseClass,
  popoverOptionSelectedClass,
} from "../shared/popover-option-classes";
import { StatusConfigDot } from "../shared/status-badge";
import { buildStatusConfig, getStatusEntry } from "../shared/types";
import { Check } from "lucide-react";
import { InlineFieldWrapper } from "./card-field-wrapper";

interface InlineStatusProps {
  ticketId: number;
  projectId: number;
  currentStatus: string;
  projectStatuses?: Array<{ name: string; color: string | null; type?: string | null }>;
}

export const InlineStatus = memo(function InlineStatus({
  ticketId,
  projectId,
  currentStatus,
  projectStatuses,
}: InlineStatusProps) {
  const [open, setOpen] = useState(false);
  const updateTicket = useUpdateTicket(projectId, {
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const resolvedConfig =
    projectStatuses && projectStatuses.length > 0
      ? buildStatusConfig(projectStatuses)
      : buildStatusConfig([]);

  const statusList =
    projectStatuses && projectStatuses.length > 0
      ? projectStatuses.map((s) => s.name)
      : ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

  function makeStatusHandler(status: string) {
    return function selectStatus() {
      updateTicket.mutate({ ticketId, status });
      setOpen(false);
    };
  }

  const currentEntry = getStatusEntry(resolvedConfig, currentStatus);

  return (
    <InlineFieldWrapper>
      <ResponsivePopover open={open} onOpenChange={setOpen}>
        <ResponsivePopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted/60 transition-colors"
            aria-label="Change status"
          >
            <StatusConfigDot
              entry={currentEntry}
              className="h-1.5 w-1.5 rounded-full shrink-0"
            />
            <span className="text-[10px] text-muted-foreground">
              {currentEntry.label}
            </span>
          </button>
        </ResponsivePopoverTrigger>
        <ResponsivePopoverContent
          title="Status"
          className={cn("p-1", INLINE_POPOVER_MIN_CLASS, "min-w-44")}
          align="start"
        >
          {statusList.map((status) => {
            const entry = getStatusEntry(resolvedConfig, status);
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
                <StatusConfigDot entry={entry} />
                {entry.label}
                {status === currentStatus && (
                  <Check className="ml-auto h-3 w-3" />
                )}
              </button>
            );
          })}
        </ResponsivePopoverContent>
      </ResponsivePopover>
    </InlineFieldWrapper>
  );
});
