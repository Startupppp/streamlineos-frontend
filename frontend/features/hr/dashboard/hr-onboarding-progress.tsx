"use client";

import { Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useHrOnboardingStatus } from "@/hooks/api/hr/dashboard";

function OnboardingProgressSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3.5 w-10" />
      </div>
      <Skeleton className="h-2 w-full" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-1.5">
          <Skeleton className="h-7 w-7 rounded-full" />
          <div className="flex-1 min-w-0 space-y-1">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-2 w-full" />
          </div>
          <Skeleton className="h-3.5 w-10" />
        </div>
      ))}
    </div>
  );
}

export function HrOnboardingProgress() {
  const { data, isLoading, isError, error, refetch } = useHrOnboardingStatus();

  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60">
        <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm font-semibold">Onboarding progress</span>
      </div>

      {isLoading ? (
        <OnboardingProgressSkeleton />
      ) : isError ? (
        <ErrorState
          title="Couldn't load onboarding status"
          description={getErrorMessage(error)}
          onRetry={() => void refetch()}
          className="py-6"
        />
      ) : !data ? null : data.total === 0 ? (
        <EmptyState
          illustration={<Users className="h-8 w-8 text-muted-foreground" aria-hidden="true" />}
          title="No active onboardings"
          description="No new hires are currently onboarding."
          className="border-0 bg-transparent min-h-[100px]"
        />
      ) : (
        <div className="p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-label font-medium text-muted-foreground">
                Overall completion
              </span>
              <span className="text-sm font-semibold tabular-nums">
                {data.completionPct}%
              </span>
            </div>
            <Progress value={data.completionPct} className="h-2" />
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">
                {data.completed} of {data.total} completed
              </span>
              <span className="text-xs text-muted-foreground">
                {data.inProgress} in progress
              </span>
            </div>
          </div>

          {data.newHires.length > 0 && (
            <ul className="space-y-2">
              {data.newHires.map((hire) => (
                <li key={hire.userId} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate flex-1 min-w-0">
                      {hire.name}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {hire.completedTasks}/{hire.totalTasks}
                    </span>
                  </div>
                  <Progress value={hire.pct} className="h-1.5" />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
