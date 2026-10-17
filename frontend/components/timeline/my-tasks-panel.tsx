"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { CheckSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { ErrorState } from "@/components/shared/error-state";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import {
  useCompleteActivityTask,
  useMyActivityTasks,
} from "@/hooks/api/crm/activity-timeline";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { TimelineEntryRow } from "./timeline-entry-row";

export interface MyTasksPanelProps {
  className?: string;
}

/**
 * The tasks assigned to whoever is reading, soonest first.
 *
 * These are the tasks logged against a customer, a deal or a subject — the same
 * rows their timelines show. Without this they existed and were reachable only
 * by opening the record you already had to remember.
 *
 * It renders nothing at all when the reader has none, or may not read
 * activities: this sits above a screen that is already a task queue, and an
 * empty panel there would be a second empty state arguing with the first. That
 * is not the denial-reads-as-emptiness trap — nothing here claims there is no
 * work, because nothing here is drawn. A *failure* is different, and says so.
 */
export function MyTasksPanel({ className }: MyTasksPanelProps) {
  const tasks = useMyActivityTasks();
  const completeTask = useCompleteActivityTask();

  const entries = useMemo(
    () => tasks.data?.pages.flatMap((page) => page.data) ?? [],
    [tasks.data],
  );

  function handleComplete(activityId: string) {
    completeTask.mutate(activityId, {
      onSuccess: () => toast.success("Task completed"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleRetry() {
    void tasks.refetch();
  }

  function handleLoadMore() {
    void tasks.fetchNextPage();
  }

  if (tasks.access.denied) return null;

  if (tasks.isLoading)
    return (
      <section className={cn(CONTENT_PANEL_SOLID, "p-4", className)}>
        <Skeleton className="h-4 w-32" />
        <div className="mt-4 flex flex-col gap-3">
          {[0, 1].map((row) => (
            <div key={row} className="flex gap-3">
              <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );

  if (tasks.isError)
    return (
      <ErrorState
        className={className}
        title="Couldn't load your tasks"
        description={getErrorMessage(tasks.error)}
        onRetry={handleRetry}
      />
    );

  if (entries.length === 0) return null;

  return (
    <section className={cn(CONTENT_PANEL_SOLID, "p-4", className)}>
      <header className="mb-3 flex min-w-0 items-center gap-2">
        <CheckSquare className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-semibold">Assigned to me</h2>
        <span className="text-dense tabular-nums text-muted-foreground">{entries.length}</span>
      </header>

      <ul className="flex min-w-0 flex-col">
        {entries.map((entry) => (
          <TimelineEntryRow
            key={entry.activityId}
            entry={entry}
            anchor={entry.anchor}
            withDates
            onComplete={handleComplete}
            isCompleting={completeTask.isPending && completeTask.variables === entry.activityId}
          />
        ))}
      </ul>

      <InfiniteScrollSentinel
        hasNextPage={tasks.hasNextPage}
        isFetchingNextPage={tasks.isFetchingNextPage}
        onLoadMore={handleLoadMore}
        label="Show more tasks"
      />
    </section>
  );
}
