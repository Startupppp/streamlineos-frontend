"use client";

import { useMemo } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { Umbrella } from "lucide-react";
import { HrPanel, HrSectionHeader } from "@/features/hr/shared/hr-ui";
import {
  hubSectionData,
  hubSectionError,
  type HrHubCardProps,
} from "@/hooks/api/hr/hub";
import { SkeletonRows, ErrorRetry } from "./today-card";

export function NextHolidayCard({
  section,
  isLoading,
  onRetry,
}: HrHubCardProps<"holidays">) {
  const data = hubSectionData(section);
  const error = hubSectionError(section);

  const todayStr = new Date().toISOString().slice(0, 10);
  const next = useMemo(
    () =>
      (data ?? [])
        .filter((h) => h.date >= todayStr)
        .sort((a, b) => a.date.localeCompare(b.date))[0],
    [data, todayStr],
  );

  const daysUntil = next
    ? differenceInCalendarDays(new Date(next.date), new Date())
    : null;

  return (
    <HrPanel>
      <HrSectionHeader title="Next holiday" />
      {isLoading ? (
        <SkeletonRows />
      ) : error ? (
        <ErrorRetry error={error} onRetry={onRetry} />
      ) : !next ? (
        <p className="text-xs text-muted-foreground">No holidays remaining this year.</p>
      ) : (
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
            <Umbrella className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {next.name}
            </p>
            <p className="text-micro text-muted-foreground">
              {format(new Date(next.date), "EEEE, MMM d")}
              {daysUntil !== null && daysUntil > 0
                ? ` · in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`
                : daysUntil === 0
                  ? " · today"
                  : ""}
            </p>
          </div>
        </div>
      )}
    </HrPanel>
  );
}
