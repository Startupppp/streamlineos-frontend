"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import {
  useActivityTimeline,
  useCompleteActivityTask,
} from "@/hooks/api/crm/activity-timeline";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatDateOnly } from "@/lib/date-utils";
import type { TimelineAnchor, TimelineEntry } from "@/types/crm/activities";
import { TimelineEntryRow } from "./timeline-entry-row";

/** Groups consecutive entries under a day heading, preserving order within a day. */
function groupByDay(entries: TimelineEntry[]): Array<{ day: string; entries: TimelineEntry[] }> {
  const days: Array<{ day: string; entries: TimelineEntry[] }> = [];

  for (const entry of entries) {
    const day = entry.occurredAt.slice(0, 10);
    const current = days[days.length - 1];
    if (current && current.day === day) current.entries.push(entry);
    else days.push({ day, entries: [entry] });
  }

  return days;
}

export interface ActivityTimelineProps {
  anchor: TimelineAnchor | null;
  /** What the empty state should suggest, in the caller's own words. */
  emptyDescription?: string;
  className?: string;
}

/**
 * One chronological timeline across every activity kind.
 *
 * Deliberately hand-written rather than rendered from a layout description —
 * this is a reading surface, not a record grid, and the ticket says so. It is
 * one component for party, deal and subject because six entity-specific
 * timelines with six event shapes is what this replaces.
 */
export function ActivityTimeline({ anchor, emptyDescription, className }: ActivityTimelineProps) {
  const timeline = useActivityTimeline(anchor);
  const completeTask = useCompleteActivityTask();

  const entries = useMemo(
    () => timeline.data?.pages.flatMap((page) => page.data) ?? [],
    [timeline.data],
  );
  const days = useMemo(() => groupByDay(entries), [entries]);

  function handleComplete(activityId: string) {
    completeTask.mutate(activityId, {
      onSuccess: () => toast.success("Task completed"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleRetry() {
    void timeline.refetch();
  }

  function handleLoadMore() {
    void timeline.fetchNextPage();
  }

  if (timeline.isLoading)
    return (
      <div className={className}>
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex gap-3">
              <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );

  if (timeline.isError)
    return (
      <ErrorState
        className={className}
        title="Couldn't load the timeline"
        description={getErrorMessage(timeline.error)}
        onRetry={handleRetry}
      />
    );

  if (entries.length === 0)
    return (
      <EmptyState
        access={timeline.access}
        className={className}
        title="Nothing here yet"
        description={
          emptyDescription ??
          "Calls, emails, meetings, notes and tasks will appear here as they happen."
        }
      />
    );

  return (
    <div className={className}>
      <div className="flex min-w-0 flex-col gap-4">
        {days.map((day) => (
          <section key={day.day} className="flex min-w-0 flex-col gap-2">
            <h3 className="text-dense font-medium uppercase tracking-wider text-muted-foreground">
              {formatDateOnly(day.day)}
            </h3>
            <ul className="flex min-w-0 flex-col">
              {day.entries.map((entry) => (
                <TimelineEntryRow
                  key={entry.activityId}
                  entry={entry}
                  onComplete={handleComplete}
                  isCompleting={
                    completeTask.isPending && completeTask.variables === entry.activityId
                  }
                />
              ))}
            </ul>
          </section>
        ))}

        {timeline.hasNextPage ? (
          <Button
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={handleLoadMore}
            disabled={timeline.isFetchingNextPage}
          >
            {timeline.isFetchingNextPage ? "Loading…" : "Load older"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
