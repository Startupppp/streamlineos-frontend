"use client";

import { useMemo } from "react";
import { isToday, format } from "date-fns";
import { CalendarClock } from "lucide-react";
import { useInterviews } from "@/hooks/api/hr";
import { getUserDisplayName } from "@/features/build/shared/resolve-user-name";
import { HrPanel, HrSectionHeader } from "@/features/hr/shared/hr-ui";
import { SkeletonRows, ErrorRetry } from "./today-card";

export function InterviewsTodayCard({ enabled }: { enabled: boolean }) {
  const { data, isLoading, isError, error, refetch } = useInterviews(
    { relevant: true, pageSize: 10 },
    { enabled },
  );

  const handleRetry = () => { void refetch(); };

  const todayInterviews = useMemo(
    () =>
      (data ?? [])
        .filter((i) => isToday(new Date(i.scheduledAt)))
        .slice(0, 5),
    [data],
  );

  return (
    <HrPanel>
      <HrSectionHeader
        title="Interviews today"
        action={{ label: "All interviews", href: "/hr/recruitment/interviews" }}
      />
      {isLoading ? (
        <SkeletonRows />
      ) : isError ? (
        <ErrorRetry error={error} onRetry={handleRetry} />
      ) : todayInterviews.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No interviews scheduled today.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {todayInterviews.map((i) => (
            <li key={i.id} className="flex items-center gap-2 min-w-0">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-500/10">
                <CalendarClock className="h-3 w-3 text-blue-600 dark:text-blue-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {i.candidate
                    ? getUserDisplayName({
                        firstName: i.candidate.firstName,
                        lastName: i.candidate.lastName,
                      })
                    : "Candidate"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {format(new Date(i.scheduledAt), "h:mm a")}
                  {i.type ? ` · ${i.type}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </HrPanel>
  );
}
