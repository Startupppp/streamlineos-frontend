"use client";

import { useMemo } from "react";
import { isToday, format } from "date-fns";
import { CalendarClock } from "lucide-react";
import { getUserDisplayName } from "@/features/build/shared/resolve-user-name";
import { HrPanel, HrSectionHeader } from "@/features/hr/shared/hr-ui";
import {
  hubSectionData,
  hubSectionError,
  type HrHubCardProps,
} from "@/hooks/api/hr/hub";
import { SkeletonRows, ErrorRetry } from "./today-card";

export function InterviewsTodayCard({
  section,
  isLoading,
  onRetry,
}: HrHubCardProps<"interviews">) {
  const data = hubSectionData(section)?.items;
  const error = hubSectionError(section);

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
      ) : error ? (
        <ErrorRetry error={error} onRetry={onRetry} />
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
