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
import { StatusConfigDot } from "@/components/ui/status-config-dot";
import { buildStatusConfig } from "../shared/types";
import { getStatusEntry } from "@/lib/status-config";
import { Check } from "lucide-react";
import { InlineFieldWrapper } from "./card-field-wrapper";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface InlineStatusProps {
  ticketId: number;
  projectId: number;
  version: number;
  currentStatus: string;
  projectStatuses?: Array<{ name: string; color: string | null; type?: string | null }>;
  compact?: boolean;
}

export const InlineStatus = memo(function InlineStatus({
  ticketId,
  projectId,
  version,
  currentStatus,
  projectStatuses,
  compact = false,
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
      if (updateTicket.isPending) return;
      updateTicket.mutate({ ticketId, version, status });
      setOpen(false);
    };
  }

  const currentEntry = getStatusEntry(resolvedConfig, currentStatus);

  return (
    <InlineFieldWrapper>
      <TooltipProvider delayDuration={200}>
      <Tooltip>
      <ResponsivePopover open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
        <ResponsivePopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted/60 transition-colors disabled:pointer-events-none disabled:opacity-50"
            aria-label={compact ? `Change status: ${currentEntry.label}` : "Change status"}
            disabled={updateTicket.isPending}
            aria-busy={updateTicket.isPending || undefined}
          >
            <StatusConfigDot
              entry={currentEntry}
              className={compact ? "h-3 w-3 rounded-full shrink-0" : "h-1.5 w-1.5 rounded-full shrink-0"}
            />
            {!compact ? <span className="text-micro text-muted-foreground">
              {currentEntry.label}
            </span> : null}
          </button>
        </ResponsivePopoverTrigger>
        </TooltipTrigger>
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
      <TooltipContent>{currentEntry.label}</TooltipContent>
      </Tooltip>
      </TooltipProvider>
    </InlineFieldWrapper>
  );
});
