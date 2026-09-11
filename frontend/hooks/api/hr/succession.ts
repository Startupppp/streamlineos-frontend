"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { hrEngagementQueryKeys } from "@/lib/query-keys/hr-engagement";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

const noContentC = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
import { NULL_CURSOR_YET } from "@/hooks/api/cursor-page-param";

const successionListContract = lazyContract(() =>
  import("@/hooks/api/hr/succession-schema").then((m) => m.successionPlanListContract),
);
const successionRowContract = lazyContract(() =>
  import("@/hooks/api/hr/succession-schema").then((m) => m.successionPlanContract),
);
export type SuccessionReadiness = "ready_now" | "1_2_years" | "3_plus";

export interface SuccessionPlan {
  id: number;
  orgId: string;
  positionId: string | null;
  positionTitle: string | null;
  incumbentUserId: string | null;
  incumbentMembershipId: number | null;
  successorUserId: string | null;
  successorMembershipId: number | null;
  readiness: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface SuccessionPage {
  items: SuccessionPlan[];
  nextCursor: string | null;
}

export function useSuccessionPlans() {
  const canView = useCan("hr:succession:view");
  const hrEnabled = useModuleEnabled("hr");
  return useInfiniteQuery({
    queryKey: hrEngagementQueryKeys.hrSuccession.list(),
    initialPageParam: NULL_CURSOR_YET,
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({ limit: "30" });
      if (pageParam !== null) params.set("cursor", pageParam);
      return apiClient.get(
        `/hr/succession?${params}`,
        undefined,
        signal,
        successionListContract,
      );
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 60_000,
    enabled: canView && hrEnabled,
  });
}

export function useCreateSuccessionPlan() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:succession:manage", {
    mutationKey: ["hr", "succession", "create"],
    mutationFn: (
      body: {
        roleName: string;
        successorId: string;
        incumbentId?: string | null;
        jobRoleId?: number | null;
        readiness?: SuccessionReadiness;
        note?: string | null;
      },
    ) => apiClient.post("/hr/succession", body, undefined, successionRowContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrEngagementQueryKeys.hrSuccession.list() }),
  });
}

export function useDeleteSuccessionPlan() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:succession:manage", {
    mutationKey: ["hr", "succession", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<void>(`/hr/succession/${id}`, undefined, undefined, noContentC),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrEngagementQueryKeys.hrSuccession.list() }),
  });
}
