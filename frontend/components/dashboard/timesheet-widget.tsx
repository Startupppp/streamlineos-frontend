"use client";

import { WidgetCard } from "@/components/ui/widget-card";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyCalendarIllustration } from "@/components/illustrations";
import { usePersonalDashboard } from "@/hooks/api/dashboard";
import { Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function TimesheetWidget() {
  const { data, isLoading, error } = usePersonalDashboard();
  const ts = data?.timesheetStatus;

  return (
    <WidgetCard
      icon={Clock}
      title="Timesheet"
      link={{ href: "/timesheets", ariaLabel: "Go to timesheets" }}
      isLoading={isLoading}
      error={error}
      loadingRows={2}
    >
      {ts ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-wide",
                  ts.submitted ? "text-emerald-600" : "text-red-600",
                )}
              >
                {ts.submitted ? "Submitted" : "Hours Missing"}
              </p>
              <p className="text-2xl font-bold tabular-nums leading-none mt-1">
                {ts.hoursLogged.toFixed(1)}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  hrs
                </span>
              </p>
            </div>
            <div
              className={cn(
                "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                ts.submitted ? "bg-emerald-500/10" : "bg-red-500/10",
              )}
            >
              {ts.submitted ? (
                <CheckCircle2
                  className="h-4 w-4 text-emerald-600"
                  aria-hidden="true"
                />
              ) : (
                <AlertTriangle
                  className="h-4 w-4 text-red-600"
                  aria-hidden="true"
                />
              )}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">{ts.weekLabel}</p>
        </div>
      ) : (
        <EmptyState
          illustration={<EmptyCalendarIllustration className="h-20 w-20" />}
          title="No timesheet this week"
          description="Log your hours to track weekly progress."
          compact
        />
      )}
    </WidgetCard>
  );
}
