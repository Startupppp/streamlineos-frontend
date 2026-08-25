"use client";

import { useState, useCallback } from "react";
import { Calendar } from "lucide-react";
import { ChevronLeftIcon, ChevronRightIcon } from "@animateicons/react/lucide";
import { format, parseISO } from "date-fns";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useComplianceCalendar } from "@/hooks/api/hr/compliance-calendar";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";

const EVENT_TYPE_STYLES: Record<string, string> = {
  document_expiry: "bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300",
  certification_expiry: "bg-rose-100 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  document_expiry: "Doc Expiry",
  certification_expiry: "Cert Expiry",
};

export function ComplianceCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const { data, isLoading } = useComplianceCalendar(year, month);

  const handlePrev = useCallback(() => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  }, [month]);

  const handleNext = useCallback(() => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  }, [month]);

  const events = data?.events ?? [];
  const monthLabel = format(new Date(year, month - 1, 1), "MMMM yyyy");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{monthLabel}</p>
        <div className="flex items-center gap-1">
          <TooltipIconButton
            icon={ChevronLeftIcon}
            label="Previous month"
            variant="outline"
            iconSize={14}
            className="w-7"
            onClick={handlePrev}
          />
          <TooltipIconButton
            icon={ChevronRightIcon}
            label="Next month"
            variant="outline"
            iconSize={14}
            className="w-7"
            onClick={handleNext}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          illustration={<Calendar className="w-8 text-muted-foreground" />}
          title="No compliance events"
          description={`No expiries in ${monthLabel}.`}
          compact
        />
      ) : (
        <div className="space-y-2">
          {events.map((ev, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors duration-200"
            >
              <div className="shrink-0 text-center">
                <p className="text-xs font-mono text-muted-foreground">
                  {format(parseISO(ev.date), "MMM d")}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <TruncatedText text={ev.entityName} className="text-sm font-medium text-foreground" />
              </div>
              <span
                className={cn(
                  "shrink-0 inline-flex items-center text-micro font-semibold px-2 py-0.5 rounded-full border",
                  EVENT_TYPE_STYLES[ev.type] ?? "",
                )}
              >
                {EVENT_TYPE_LABELS[ev.type] ?? ev.type}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
