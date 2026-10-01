"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { statusToneClasses } from "@/lib/design-tokens";
import { useHrTeamAvailability } from "@/hooks/api/hr/leaves-team-availability";
import {
  buildAvailabilityDays,
  monthWindow,
  shiftMonth,
  type MonthWindow,
} from "./team-availability-model";

function currentMonthWindow(): MonthWindow {
  const now = new Date();
  return monthWindow(now.getFullYear(), now.getMonth() + 1);
}

export function TeamAvailabilityOverlay() {
  const [monthView, setMonthView] = useState<MonthWindow>(currentMonthWindow);
  const query = useHrTeamAvailability({
    startDate: monthView.startDate,
    endDate: monthView.endDate,
  });
  const pageState = usePageState({
    permission: "hr:leaves:read",
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  });

  const days = useMemo(
    () => buildAvailabilityDays(monthView, query.data ?? []),
    [monthView, query.data],
  );
  const tone = statusToneClasses("warning");

  const handlePreviousMonth = useCallback(() => {
    setMonthView((current) => shiftMonth(current, -1));
  }, []);
  const handleNextMonth = useCallback(() => {
    setMonthView((current) => shiftMonth(current, 1));
  }, []);
  const handleRetry = useCallback(() => {
    void query.refetch();
  }, [query]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="shrink-0 border-b px-4 pb-3 pt-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Users className="h-4 w-4 text-muted-foreground" />
          Who is away · {monthView.label}
          <span className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8"
              aria-label="Previous month"
              onClick={handlePreviousMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8"
              aria-label="Next month"
              onClick={handleNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-3">
        {pageState.kind !== "ready" && pageState.kind !== "empty" ? (
          <PageState
            resolution={pageState}
            compact
            onRetry={handleRetry}
            loading={<Skeleton className="h-24 w-full rounded-lg" />}
          >
            {null}
          </PageState>
        ) : (query.data ?? []).length === 0 ? (
          <EmptyState
            illustrationPreset="calendar"
            title="Nobody is away this month"
            description="Approved leave for the people you can see will show up here."
            compact
          />
        ) : (
          <ol className="grid grid-cols-7 gap-1" aria-label="Approved leave by day">
            {days.map((day) => (
              <li
                key={day.dayKey}
                title={
                  day.names.length > 0
                    ? `${day.dayKey}: ${day.names.join(", ")}`
                    : `${day.dayKey}: nobody away`
                }
                className={`flex min-h-12 flex-col items-center justify-center rounded-md border px-1 py-1 ${
                  day.names.length > 0
                    ? `${tone.surface} ${tone.rule} ${tone.ink}`
                    : "border-border bg-muted/20 text-muted-foreground"
                } ${day.isWeekend ? "opacity-60" : ""}`}
              >
                <span className="text-micro tabular-nums">{day.dayOfMonth}</span>
                <span className="text-dense font-semibold tabular-nums">
                  {day.names.length > 0 ? day.names.length : "—"}
                </span>
                <span className="sr-only">
                  {day.names.length > 0
                    ? `${day.names.length} away: ${day.names.join(", ")}`
                    : "nobody away"}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
