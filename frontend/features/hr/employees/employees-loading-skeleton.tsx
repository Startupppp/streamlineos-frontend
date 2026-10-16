"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { StalledReadNotice } from "@/components/shared/stalled-read-notice";
import { PANEL_STALLED_AFTER_MS, useStalledAfter } from "@/hooks/common/use-stalled-after";

interface EmployeesGridSkeletonProps {
  count?: number;
  /** Offers "Still loading… Try again" once the directory read has been pending for a while. */
  onStalledRetry?: () => void;
}

export function EmployeesGridSkeleton({ count = 12, onStalledRetry }: EmployeesGridSkeletonProps) {
  const stalled = useStalledAfter(!!onStalledRetry, PANEL_STALLED_AFTER_MS);
  return (
    <>
      {stalled && onStalledRetry ? (
        <StalledReadNotice subject="employees" onRetry={onStalledRetry} />
      ) : null}
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-border/80 bg-card p-3.5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-28 flex-1" />
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="mt-3 h-3 w-40" />
          </div>
        ))}
      </div>
    </>
  );
}
