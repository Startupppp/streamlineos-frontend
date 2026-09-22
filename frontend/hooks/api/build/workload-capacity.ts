"use client";

import { useQuery } from "@tanstack/react-query";
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
  options?: { enabled?: boolean },
): Map<string, MemberCapacityData> {
  const { data } = useQuery({
    queryKey: buildWorkQueryKeys.projects.workloadCapacity(projectId, start, end),
    queryFn: ({ signal }) =>
      apiClient.get(
        `/build/${projectId}/workload/capacity`,
        { start, end },
        signal,
        workloadCapacityContract,
      ),
    enabled: options?.enabled !== false,
    staleTime: 60_000,
  });

  if (!data?.members) return new Map();

  return new Map(
    data.members.map((m) => [
      m.userId,
      {
        capacityHours: m.capacityHours,
        loggedHours: m.loggedHours,
        isOverAllocated: m.isOverAllocated,
        isZeroCapacity: m.isZeroCapacity,
        utilizationPercent: m.utilizationPercent,
      } satisfies MemberCapacityData,
    ]),
  );
}
