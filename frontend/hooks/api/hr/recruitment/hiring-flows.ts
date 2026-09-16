"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { OffsetPage } from "@/hooks/api/offset-page-schema";
import type {
  HiringFlow,
  HiringFlowRound,
  CreateHiringFlowInput,
  UpdateHiringFlowInput,
  CreateHiringFlowRoundInput,
  UpdateHiringFlowRoundInput,
} from "@/types/hr/recruitment";
import { useGatedQuery } from "@/hooks/api/gated-query";

const hiringFlowListContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/hiring-flows-schema").then(
    (m) => m.hiringFlowListResponseSchema,
  ),
);
const hiringFlowContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/hiring-flows-schema").then(
    (m) => m.hiringFlowSchema,
  ),
);
const hiringFlowSuccessContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/hiring-flows-schema").then(
    (m) => m.hiringFlowSuccessSchema,
  ),
);
const hiringRoundContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/hiring-flows-schema").then(
    (m) => m.hiringRoundSchema,
  ),
);

export function useHiringFlows() {
  return useGatedQuery("hr:interviews:view", {
    queryKey: humanResourcesQueryKeys.hr.hiringFlows(),
    queryFn: async ({ signal }) =>
      (await apiClient.get<OffsetPage<HiringFlow>>("/hr/recruitment/hiring-flows", undefined, signal, hiringFlowListContract)).items,
    staleTime: 2 * 60_000,
  });
}

export function useCreateHiringFlow() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["hr", "recruitment", "hiring-flows", "create"],
    mutationFn: (data: CreateHiringFlowInput) =>
      apiClient.post<HiringFlow>("/hr/recruitment/hiring-flows", data, undefined, hiringFlowContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hiringFlows() });
    },
  });
}

export function useUpdateHiringFlow() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["hr", "recruitment", "hiring-flows", "update"],
    mutationFn: ({ hiringFlowId, ...data }: UpdateHiringFlowInput & { hiringFlowId: number }) =>
      apiClient.patch<HiringFlow>(`/hr/recruitment/hiring-flows/${hiringFlowId}`, data, undefined, hiringFlowContract),
    onSuccess: (_, { hiringFlowId }) => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hiringFlows() });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hiringFlow(hiringFlowId) });
    },
  });
}

export function useDeleteHiringFlow() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["hr", "recruitment", "hiring-flows", "delete"],
    mutationFn: (hiringFlowId: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/recruitment/hiring-flows/${hiringFlowId}`, undefined, undefined, hiringFlowSuccessContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hiringFlows() });
    },
  });
}

export function useCreateHiringFlowRound() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["hr", "recruitment", "hiring-flow-rounds", "create"],
    mutationFn: ({ flowId, ...data }: CreateHiringFlowRoundInput & { flowId: number }) =>
      apiClient.post<HiringFlowRound>(`/hr/recruitment/hiring-flows/${flowId}/rounds`, data, undefined, hiringRoundContract),
    onSuccess: (_, { flowId }) => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hiringFlows() });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hiringFlow(flowId) });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hiringFlowRounds(flowId) });
    },
  });
}

export function useUpdateHiringFlowRound() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["hr", "recruitment", "hiring-flow-rounds", "update"],
    mutationFn: ({ flowId, roundId, ...data }: UpdateHiringFlowRoundInput & { flowId: number; roundId: number }) =>
      apiClient.patch<HiringFlowRound>(`/hr/recruitment/hiring-flows/${flowId}/rounds/${roundId}`, data, undefined, hiringRoundContract),
    onSuccess: (_, { flowId }) => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hiringFlows() });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hiringFlow(flowId) });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hiringFlowRounds(flowId) });
    },
  });
}

export function useDeleteHiringFlowRound() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["hr", "recruitment", "hiring-flow-rounds", "delete"],
    mutationFn: ({ flowId, roundId }: { flowId: number; roundId: number }) =>
      apiClient.delete<{ success: boolean }>(`/hr/recruitment/hiring-flows/${flowId}/rounds/${roundId}`, undefined, undefined, hiringFlowSuccessContract),
    onSuccess: (_, { flowId }) => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hiringFlows() });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hiringFlow(flowId) });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hiringFlowRounds(flowId) });
    },
  });
}
