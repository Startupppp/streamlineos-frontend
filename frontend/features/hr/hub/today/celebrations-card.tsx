"use client";

import { useHrDashboardMetrics } from "@/hooks/api/hr";
import { getUserDisplayName } from "@/features/build/shared/resolve-user-name";
import { HrPanel, HrSectionHeader } from "@/features/hr/shared/hr-ui";
import { SkeletonRows, ErrorRetry, AvatarInitials } from "./today-card";

export function CelebrationsCard() {
  const { data, isLoading, isError, error, refetch } = useHrDashboardMetrics();

  const handleRetry = () => { void refetch(); };

  const birthdays = (data?.upcomingBirthdays ?? []).slice(0, 5);

  return (
    <HrPanel>
      <HrSectionHeader title="Upcoming birthdays" />
      {isLoading ? (
        <SkeletonRows />
      ) : isError ? (
        <ErrorRetry error={error} onRetry={handleRetry} />
      ) : birthdays.length === 0 ? (
        <p className="text-xs text-muted-foreground">No birthdays this week.</p>
      ) : (
        <ul className="space-y-1.5">
          {birthdays.map((b) => (
            <li key={b.id} className="flex items-center gap-2 min-w-0">
              <AvatarInitials
                name={
                  getUserDisplayName({
                    name: b.name,
                    firstName: b.firstName,
                    lastName: b.lastName,
                  })
                }
                image={b.image}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {getUserDisplayName({
                    name: b.name,
                    firstName: b.firstName,
                    lastName: b.lastName,
                  })}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {b.daysUntil === 0
                    ? "Today!"
                    : b.daysUntil === 1
                      ? "Tomorrow"
                      : `In ${b.daysUntil} days`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </HrPanel>
  );
}
