"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSeatInfo } from "@/hooks/api/subscription";
import { SEAT_RULE } from "@/lib/billing/seat-rule";
import { cn } from "@/lib/utils";

export function InviteSeatNotice({ requesting }: { requesting?: number }) {
  const { data: seats } = useSeatInfo();
  if (!seats || seats.available === null) return null;

  const { available } = seats;
  const shortBy = requesting === undefined ? 0 : requesting - available;
  const isTight = available === 0 || shortBy > 0;
  const summary =
    available === 0
      ? `No seats are free on your plan (${String(seats.used)} of ${String(seats.total ?? seats.used)} in use).`
      : `${String(available)} of ${String(seats.total ?? available)} seats free.`;
  const shortLabel =
    available === 0
      ? "No seats free"
      : `${String(available)} of ${String(seats.total ?? available)} free`;
  const shortfall =
    shortBy > 0
      ? ` This invite needs ${String(requesting)}, so ${String(shortBy)} will be refused.`
      : "";
  const detail = `${summary}${shortfall} ${SEAT_RULE} A pending invitation holds its seat until it is accepted, declined or cancelled.`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-5 shrink-0 items-center gap-1 rounded-md px-1 text-xs leading-none outline-none transition-colors",
            "focus-visible:ring-2 focus-visible:ring-ring",
            isTight
              ? "text-status-danger-ink hover:bg-status-danger-surface"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
          aria-label={summary}
        >
          <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="tabular-nums leading-none">{shortLabel}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="end"
        className="max-w-xs text-xs leading-relaxed"
      >
        {detail}
      </TooltipContent>
    </Tooltip>
  );
}
