"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import {
  useCompleteActivityTask,
  useMyActivityTasks,
} from "@/hooks/api/crm/activity-timeline";
import { getErrorMessage } from "@/lib/get-error-message";
import { TimelineEntryRow } from "./timeline-entry-row";

export interface MyTasksPanelProps {
  className?: string;
}

/**
 * The same task rows the timeline shows, read by assignee instead of by anchor.
 *
 * The ticket asks for a task to appear both on the record's timeline and in the
 * person's own list, and this is the second of those — one row, two reads, so
 * completing it in either place is the same write.
 */
export function MyTasksPanel({ className }: MyTasksPanelProps) {
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const tasks = useMyActivityTasks(includeCompleted);
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

  function handleToggleCompleted() {
    setIncludeCompleted((previous) => !previous);
  }

  if (tasks.isLoading)
    return (
      <div className={className}>
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );

  if (tasks.isError)
    return (
      <ErrorState
        className={className}
        title="Couldn't load your tasks"
        description={getErrorMessage(tasks.error)}
        onRetry={() => void tasks.refetch()}
      />
    );

  return (
    <div className={className}>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">My tasks</h3>
          <Button variant="ghost" size="sm" onClick={handleToggleCompleted}>
            {includeCompleted ? "Hide completed" : "Show completed"}
          </Button>
        </div>

        {entries.length === 0 ? (
          <EmptyState
            className="min-h-[10rem] border-0 bg-transparent"
            title="Nothing due"
            description="Tasks extracted from your conversations, and any you add yourself, land here."
          />
        ) : (
          <ul className="flex min-w-0 flex-col">
            {entries.map((entry) => (
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
        )}

        {tasks.hasNextPage ? (
          <Button
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => void tasks.fetchNextPage()}
            disabled={tasks.isFetchingNextPage}
          >
            {tasks.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
