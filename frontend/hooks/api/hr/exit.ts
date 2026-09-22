"use client";
import type { z } from "zod";
import type {
  exitChecklistItemContract,
  exitChecklistOwnerContract,
  resignationContract,
  resignationDetailContract,
  resignationProgressContract,
  ExitChecklistItemUpdateInput,
} from "@/hooks/api/hr/exit-schema";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import { IDEMPOTENCY_HEADER } from "@/lib/idempotency-key";

export type Resignation = z.infer<typeof resignationContract>;
export type ResignationDetail = z.infer<typeof resignationDetailContract>;
export type ResignationProgress = z.infer<typeof resignationProgressContract>;
export type ExitChecklistItem = z.infer<typeof exitChecklistItemContract>;
export type ExitChecklistOwner = z.infer<typeof exitChecklistOwnerContract>;

export interface PaginatedResignations {
  data: Resignation[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
}

interface ResignationListParams {
  cursor?: string;
  limit?: number;
  status?: string;
}

const exitKeys = {
  all: [...humanResourcesQueryKeys.hr.all, "exit"] as const,
  lists: () => [...exitKeys.all, "list"] as const,
  list: (params?: ResignationListParams) => [...exitKeys.lists(), params] as const,
  detail: (resignationId: number) => [...exitKeys.all, "detail", resignationId] as const,
  progress: (resignationId: number) =>
    [...exitKeys.all, "progress", resignationId] as const,
};

const _resignationListContract = lazyContract(() =>
  import("@/hooks/api/hr/exit-schema").then((m) => m.resignationListContract),
);
const _resignationContract = lazyContract(() =>
  import("@/hooks/api/hr/exit-schema").then((m) => m.resignationContract),
);
const _resignationDetailContract = lazyContract(() =>
  import("@/hooks/api/hr/exit-schema").then((m) => m.resignationDetailContract),
);
const _exitChecklistItemContract = lazyContract(() =>
  import("@/hooks/api/hr/exit-schema").then((m) => m.exitChecklistItemContract),
);
const _successContract = lazyContract(() =>
  import("@/hooks/api/hr/exit-schema").then((m) => m.successContract),
);
const _resignationProgressContract = lazyContract(() =>
  import("@/hooks/api/hr/exit-schema").then((m) => m.resignationProgressContract),
);

export function useResignations(params?: ResignationListParams) {
  const canExit = useCan("hr:exit:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: exitKeys.list(params),
    queryFn: ({ signal }) => {
      const search = new URLSearchParams();
      if (params?.cursor) search.set("cursor", params.cursor);
      if (params?.limit) search.set("limit", String(params.limit));
      if (params?.status) search.set("status", params.status);
      const qs = search.toString();
      return apiClient.get(`/hr/exit${qs ? `?${qs}` : ""}`, undefined, signal, _resignationListContract);
    },
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    enabled: hrEnabled && canExit,
  });
}

export function useCreateResignation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:exit:create", {
    mutationKey: ["hr", "exit", "create"],
    mutationFn: (data: {
      reason: string;
      reasonCategory?: string;
      lastWorkingDate: string;
      noticePeriodDays?: number;
      willingForExitInterview?: boolean;
      companyFeedback?: string;
      resignationLetterUrl?: string;
    }) => apiClient.post("/hr/exit", data, undefined, _resignationContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: exitKeys.all }),
  });
}

export function useHrReviewResignation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:exit:manage", {
    mutationKey: ["hr", "exit", "hr-review"],
    mutationFn: ({ exitId, action, remarks }: { exitId: number; action: "approve" | "reject"; remarks?: string }) =>
      apiClient.patch(`/hr/exit/${exitId}/hr-review`, { decision: action, remarks }, undefined, _successContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: exitKeys.all }),
  });
}

export function useFinalReviewResignation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:exit:approve", {
    mutationKey: ["hr", "exit", "final-review"],
    mutationFn: ({ exitId, action, remarks }: { exitId: number; action: "approve" | "reject"; remarks?: string }) =>
      apiClient.patch(`/hr/exit/${exitId}/final-review`, { decision: action, remarks }, undefined, _successContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: exitKeys.all }),
  });
}

export function useWithdrawResignation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:exit:view", {
    mutationKey: ["hr", "exit", "withdraw"],
    mutationFn: ({ exitId }: { exitId: number }) =>
      apiClient.patch(`/hr/exit/${exitId}/withdraw`, {}, undefined, _successContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: exitKeys.all }),
  });
}

export function useResignation(resignationId: number) {
  const canView = useCan("hr:exit:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: exitKeys.detail(resignationId),
    queryFn: ({ signal }) =>
      apiClient.get(`/hr/exit/${resignationId}`, undefined, signal, _resignationDetailContract),
    staleTime: 60_000,
    enabled: hrEnabled && canView && resignationId > 0,
  });
}

export interface UpdateExitChecklistItemVariables {
  resignationId: number;
  itemKey: string;
  input: ExitChecklistItemUpdateInput;
}

export function useUpdateExitChecklistItem() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<ExitChecklistItem, Error, UpdateExitChecklistItemVariables>("hr:exit:view", {
    mutationKey: ["hr", "exit", "checklist", "update"],
    mutationFn: ({ resignationId, itemKey, input }, idempotencyKey) =>
      apiClient.patch(
        `/hr/exit/${resignationId}/checklist/${encodeURIComponent(itemKey)}`,
        input,
        { headers: { [IDEMPOTENCY_HEADER]: idempotencyKey } },
        _exitChecklistItemContract,
      ),
    onSuccess: (_item, variables) => {
      void qc.invalidateQueries({ queryKey: exitKeys.detail(variables.resignationId) });
      void qc.invalidateQueries({ queryKey: exitKeys.lists() });
    },
  });
}

export interface CompleteExitVariables {
  exitId: number;
  overrideReason?: string;
}

export function useCompleteExit() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:exit:view", {
    mutationKey: ["hr", "exit", "complete"],
    mutationFn: ({ exitId, overrideReason }: CompleteExitVariables) =>
      apiClient.patch(
        `/hr/exit/${exitId}`,
        overrideReason ? { status: "COMPLETED", overrideAssetGate: true, overrideReason } : { status: "COMPLETED" },
        undefined,
        _successContract,
      ),
    onSuccess: (_result, variables) => {
      void qc.invalidateQueries({ queryKey: exitKeys.detail(variables.exitId) });
      void qc.invalidateQueries({ queryKey: exitKeys.lists() });
    },
  });
}

export function useResignationProgress(
  resignationId: number,
  enabled: boolean,
) {
  const canView = useCan("hr:exit:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: exitKeys.progress(resignationId),
    queryFn: ({ signal }) =>
      apiClient.get(`/hr/exit/${resignationId}/progress`, undefined, signal, _resignationProgressContract),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && canView && resignationId > 0 && enabled,
  });
}
