"use client";

import { useState, useCallback } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@animateicons/react/lucide";
import { format, parseISO } from "date-fns";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useComplianceCalendar } from "@/hooks/api/hr/compliance-calendar";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";

const EVENT_TYPE_STYLES: Record<string, string> = {
  document_expiry: "bg-status-warning-surface border-status-warning-rule text-status-warning-ink",
  certification_expiry: "bg-status-danger-surface border-status-danger-rule text-status-danger-ink",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  document_expiry: "Doc Expiry",
  certification_expiry: "Cert Expiry",
};

export function ComplianceCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const { data, isLoading, isError, error, refetch } = useComplianceCalendar(year, month);
  const access = usePageState({ permission: "hr:compliance:manage", isLoading, isError, error });

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

  if (access.kind !== "ready") {
    return (
      <PageState
        resolution={access}
        onRetry={refetch}
        compact
        loading={
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-xl" />
            ))}
          </div>
        }
      >
        {null}
      </PageState>
    );
  }

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

      {events.length === 0 ? (
        <EmptyState
          illustrationPreset="calendar"
          title="No compliance events"
          description={`No expiries in ${monthLabel}.`}
          compact
        />
      ) : (
        <div className="space-y-2">
          {events.map((ev) => (
            <div
              key={`${ev.date}-${ev.type}-${ev.entityName}`}
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
