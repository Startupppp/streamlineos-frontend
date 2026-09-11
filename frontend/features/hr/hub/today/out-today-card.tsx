"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { HrPanel, HrSectionHeader } from "@/features/hr/shared/hr-ui";
import { hubSectionData, hubSectionError } from "@/hooks/api/hr/hub";
import type { HrHubCardProps } from "@/hooks/api/hr/hub-types";
import { SkeletonRows, ErrorRetry, AvatarInitials } from "./today-card";

export function OutTodayCard({
  section,
  isLoading,
  onRetry,
}: HrHubCardProps<"leaveCalendar">) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const data = hubSectionData(section);
  const error = hubSectionError(section);

  const outToday = useMemo(
    () =>
      (data ?? [])
        .filter(
          (e) =>
            e.status === "APPROVED" &&
            e.startDate <= todayStr &&
            e.endDate >= todayStr,
        )
        .slice(0, 5),
    [data, todayStr],
  );

  return (
    <HrPanel>
      <HrSectionHeader
        title="Out today"
        action={{ label: "All leaves", href: "/hr/leaves" }}
      />
      {isLoading ? (
        <SkeletonRows />
      ) : error ? (
        <ErrorRetry error={error} onRetry={onRetry} />
      ) : outToday.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nobody&apos;s out today.</p>
      ) : (
        <ul className="space-y-1.5">
          {outToday.map((entry) => (
            <li key={entry.id} className="flex items-center gap-2 min-w-0">
              <AvatarInitials
                name={entry.userName}
                image={entry.userImage}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {entry.userName}
                </p>
                <p className="text-micro text-muted-foreground truncate">
                  {entry.leaveType} · until {format(new Date(entry.endDate), "MMM d")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </HrPanel>
  );
}
