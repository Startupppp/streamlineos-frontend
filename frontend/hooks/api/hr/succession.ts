"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { queryKeys } from "@/lib/query-keys";
import { apiClient } from "@/lib/api-client";

export type SuccessionReadiness = "ready_now" | "1_2_years" | "3_plus";

export interface SuccessionPlan {
  id: number;
  orgId: string;
  roleName: string;
  jobRoleId: number | null;
  incumbentId: string | null;
  successorId: string;
  readiness: SuccessionReadiness;
  note: string | null;
  createdBy: string | null;
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
    queryKey: queryKeys.hrSuccession.list(),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({ limit: "30" });
      if (pageParam !== null) params.set("cursor", pageParam);
      return apiClient.get<SuccessionPage>(
        `/hr/succession?${params}`,
        undefined,
        signal,
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
      body: Omit<
        SuccessionPlan,
        "id" | "orgId" | "createdBy" | "createdAt" | "updatedAt"
      >,
    ) => apiClient.post<SuccessionPlan>("/hr/succession", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hrSuccession.list() }),
  });
}

export function useDeleteSuccessionPlan() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:succession:manage", {
    mutationKey: ["hr", "succession", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/succession/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hrSuccession.list() }),
  });
}
