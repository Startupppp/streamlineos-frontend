"use client";

import { useResignationProgress } from "@/hooks/api/hr";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { ExitTimeline } from "./exit-timeline";

export function ProgressTimeline({ id }: { id: number }) {
  const { data, isLoading, isError, error, refetch } = useResignationProgress(id, true);

  function handleRetry() {
    void refetch();
  }

  if (isLoading) {
    return (
      <div className="px-4 py-3 space-y-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-4 rounded-full shrink-0" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <ErrorState
        compact
        className="m-3"
        title="Couldn't load the exit progress"
        description={getErrorMessage(error)}
        onRetry={handleRetry}
      />
    );
  }

  return <ExitTimeline steps={data.steps} className="px-4 py-3" />;
}
