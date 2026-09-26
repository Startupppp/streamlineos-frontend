"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { MemberCapacityData } from "@/features/build/views/workload-types";

const workloadCapacityContract = lazyContract(() =>
  import("@/hooks/api/build/execution-schema").then((m) => m.workloadCapacityContract),
);

export function useWorkloadCapacity(
  projectId: number,
  start: string,
  end: string,
  teamId?: number,
  options?: { enabled?: boolean },
): Map<string, MemberCapacityData> {
  const canView = useCan("build:tickets:view");
  const { data } = useQuery({
    queryKey: buildWorkQueryKeys.projects.workloadCapacity(projectId, start, end, teamId),
    queryFn: ({ signal }) => {
      const query: Record<string, string> = { start, end };
      if (teamId !== undefined) query["teamId"] = String(teamId);
      return apiClient.get(
        `/build/${projectId}/workload/capacity`,
        query,
        signal,
        workloadCapacityContract,
      );
    },
    enabled: canView && options?.enabled !== false,
    staleTime: 60_000,
  });

  return useMemo(() => {
    if (!data?.members) return new Map<string, MemberCapacityData>();

    return new Map(
      data.members.map((m) => [
        m.userId,
        {
          capacityHours: m.capacityHours,
          leaveDays: m.leaveDays,
          loggedHours: m.loggedHours,
          isOverAllocated: m.isOverAllocated,
          isZeroCapacity: m.isZeroCapacity,
          utilizationPercent: m.utilizationPercent,
        } satisfies MemberCapacityData,
      ]),
    );
  }, [data]);
}
