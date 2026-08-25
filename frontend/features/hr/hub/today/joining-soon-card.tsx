"use client";

import { HrPanel, HrSectionHeader } from "@/features/hr/shared/hr-ui";
import {
  hubSectionData,
  hubSectionError,
  type HrHubCardProps,
} from "@/hooks/api/hr/hub";
import { SkeletonRows, ErrorRetry, AvatarInitials } from "./today-card";

export function JoiningSoonCard({
  section,
  isLoading,
  onRetry,
}: HrHubCardProps<"onboardingStatus">) {
  const data = hubSectionData(section);
  const error = hubSectionError(section);

  const hires = (data?.newHires ?? []).slice(0, 5);

  return (
    <HrPanel>
      <HrSectionHeader
        title="Joining soon"
        action={{ label: "Onboarding", href: "/hr/onboarding" }}
      />
      {isLoading ? (
        <SkeletonRows />
      ) : error ? (
        <ErrorRetry error={error} onRetry={onRetry} />
      ) : hires.length === 0 ? (
        <p className="text-xs text-muted-foreground">No active onboarding.</p>
      ) : (
        <ul className="space-y-1.5">
          {hires.map((hire) => (
            <li key={hire.userId} className="flex items-center gap-2 min-w-0">
              <AvatarInitials name={hire.name} image={null} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {hire.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${hire.pct}%` }}
                    />
                  </div>
                  <span className="text-micro text-muted-foreground shrink-0">
                    {hire.pct}%
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </HrPanel>
  );
}
