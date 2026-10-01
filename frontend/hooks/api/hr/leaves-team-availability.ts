"use client";

import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type { TeamAvailabilityRow } from "@/hooks/api/hr/leaves-team-availability-schema";

const teamAvailabilityC = lazyContract(() =>
  import("@/hooks/api/hr/leaves-team-availability-schema").then(
    (m) => m.teamAvailabilityContract,
  ),
);

export interface TeamAvailabilityWindow {
  startDate: string;
  endDate: string;
}

export function useHrTeamAvailability(
  window: TeamAvailabilityWindow,
  options?: { enabled?: boolean },
) {
  return useGatedQuery("hr:leaves:view", {
    queryKey: [
      ...humanResourcesQueryKeys.hr.all,
      "team-availability",
      window.startDate,
      window.endDate,
    ],
    queryFn: ({ signal }) =>
      apiClient.get<TeamAvailabilityRow[]>(
        "/hr/leaves/team-availability",
        window,
        signal,
        teamAvailabilityC,
      ),
    staleTime: 2 * 60_000,
    enabled:
      Boolean(window.startDate && window.endDate) && (options?.enabled ?? true),
  });
}
