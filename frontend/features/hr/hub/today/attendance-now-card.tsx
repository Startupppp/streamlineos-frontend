"use client";

import { useHrTeamAttendanceStatus } from "@/hooks/api/hr";
import { cn } from "@/lib/utils";
import { HrPanel, HrSectionHeader } from "@/features/hr/shared/hr-ui";
import { SkeletonRows, ErrorRetry } from "./today-card";

export function AttendanceNowCard() {
  const { data, isLoading, isError, error, refetch } =
    useHrTeamAttendanceStatus();

  const handleRetry = () => {
    void refetch();
  };

  const counts = data?.counts;
  const present = counts?.PRESENT ?? 0;
  const onBreak = counts?.ON_BREAK ?? 0;
  const total = data?.pagination.total ?? 0;

  return (
    <HrPanel>
      <HrSectionHeader
        title="Attendance now"
        action={{ label: "View attendance", href: "/hr/attendance" }}
      />
      {isLoading ? (
        <SkeletonRows />
      ) : isError ? (
        <ErrorRetry error={error} onRetry={handleRetry} />
      ) : (
        <div className="space-y-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-foreground">
              {present}
            </span>
            <span className="text-xs text-muted-foreground">
              of {total} present
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {onBreak > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                {onBreak} on break
              </span>
            )}
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full",
                present > 0
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full shrink-0",
                  present > 0 ? "bg-emerald-500" : "bg-muted-foreground/40",
                )}
              />
              {present} present
            </span>
          </div>
        </div>
      )}
    </HrPanel>
  );
}
