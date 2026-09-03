"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  HiringFlow,
  HiringFlowRound,
  CreateHiringFlowInput,
  UpdateHiringFlowInput,
  CreateHiringFlowRoundInput,
  UpdateHiringFlowRoundInput,
} from "@/types/hr/recruitment";
import { useGatedQuery } from "@/hooks/api/gated-query";

export function useHiringFlows() {
  return useGatedQuery("hr:interviews:view", {
    queryKey: queryKeys.hr.hiringFlows(),
    queryFn: ({ signal }) => apiClient.get<HiringFlow[]>("/hr/recruitment/hiring-flows", undefined, signal),
    staleTime: 2 * 60_000,
  });
}

export function useCreateHiringFlow() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["hr", "recruitment", "hiring-flows", "create"],
    mutationFn: (data: CreateHiringFlowInput) =>
      apiClient.post<HiringFlow>("/hr/recruitment/hiring-flows", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.hiringFlows() });
    },
  });
}

export function useUpdateHiringFlow() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["hr", "recruitment", "hiring-flows", "update"],
    mutationFn: ({ id, ...data }: UpdateHiringFlowInput & { id: number }) =>
      apiClient.patch<HiringFlow>(`/hr/recruitment/hiring-flows/${id}`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.hiringFlows() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.hiringFlow(id) });
    },
  });
}

export function useDeleteHiringFlow() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["hr", "recruitment", "hiring-flows", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/recruitment/hiring-flows/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.hiringFlows() });
    },
  });
}

export function useCreateHiringFlowRound() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["hr", "recruitment", "hiring-flow-rounds", "create"],
    mutationFn: ({ flowId, ...data }: CreateHiringFlowRoundInput & { flowId: number }) =>
      apiClient.post<HiringFlowRound>(`/hr/recruitment/hiring-flows/${flowId}/rounds`, data),
    onSuccess: (_, { flowId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.hiringFlows() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.hiringFlow(flowId) });
      qc.invalidateQueries({ queryKey: queryKeys.hr.hiringFlowRounds(flowId) });
    },
  });
}

export function useUpdateHiringFlowRound() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["hr", "recruitment", "hiring-flow-rounds", "update"],
    mutationFn: ({ flowId, roundId, ...data }: UpdateHiringFlowRoundInput & { flowId: number; roundId: number }) =>
      apiClient.patch<HiringFlowRound>(`/hr/recruitment/hiring-flows/${flowId}/rounds/${roundId}`, data),
    onSuccess: (_, { flowId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.hiringFlows() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.hiringFlow(flowId) });
      qc.invalidateQueries({ queryKey: queryKeys.hr.hiringFlowRounds(flowId) });
    },
  });
}

export function useDeleteHiringFlowRound() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["hr", "recruitment", "hiring-flow-rounds", "delete"],
    mutationFn: ({ flowId, roundId }: { flowId: number; roundId: number }) =>
      apiClient.delete<{ success: boolean }>(`/hr/recruitment/hiring-flows/${flowId}/rounds/${roundId}`),
    onSuccess: (_, { flowId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.hiringFlows() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.hiringFlow(flowId) });
      qc.invalidateQueries({ queryKey: queryKeys.hr.hiringFlowRounds(flowId) });
    },
  });
}
