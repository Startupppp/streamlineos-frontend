"use client";
import type { z } from "zod";
import type {
  exitChecklistItemContract,
  exitChecklistOwnerContract,
  offboardingChecklistRowContract,
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
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import { IDEMPOTENCY_HEADER } from "@/lib/idempotency-key";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";

export type Resignation = z.infer<typeof resignationContract>;
export type ResignationDetail = z.infer<typeof resignationDetailContract>;
export type ResignationProgress = z.infer<typeof resignationProgressContract>;
export type ExitChecklistItem = z.infer<typeof exitChecklistItemContract>;
export type ExitChecklistOwner = z.infer<typeof exitChecklistOwnerContract>;
export type OffboardingChecklistRow = z.infer<typeof offboardingChecklistRowContract>;

export interface PaginatedResignations {
  data: Resignation[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
}

export interface ResignationListParams {
  cursor?: string;
  limit?: number;
  status?: string;
}


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
const _offboardingChecklistSummaryListContract = lazyContract(() =>
  import("@/hooks/api/hr/exit-schema").then((m) => m.offboardingChecklistSummaryListContract),
);

export function exitListQueryOptions(params?: ResignationListParams) {
  return {
    queryKey: humanResourcesQueryKeys.hr.exitList(params),
    staleTime: 2 * 60_000,
  } as const;
}

export function useResignations(params?: ResignationListParams) {
  const canExit = useCan("hr:exit:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    ...exitListQueryOptions(params),
    queryFn: ({ signal }) => {
      const search = new URLSearchParams();
      if (params?.cursor) search.set("cursor", params.cursor);
      if (params?.limit) search.set("limit", String(params.limit));
      if (params?.status) search.set("status", params.status);
      const qs = search.toString();
      return apiClient.get(`/hr/exit${qs ? `?${qs}` : ""}`, undefined, signal, _resignationListContract);
    },
    placeholderData: keepPreviousData,
    enabled: hrEnabled && canExit,
  });
}

export interface ResignationSubmission {
  reason: string;
  reasonCategory?: string;
  lastWorkingDate: string;
  noticePeriodDays?: number;
  willingForExitInterview?: boolean;
  companyFeedback?: string;
  resignationLetterUrl?: string;
}

export function useOffboardingChecklists() {
  const canExit = useCan("hr:exit:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.exitOffboardingChecklists(),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/hr/exit/offboarding-checklists",
        undefined,
        signal,
        _offboardingChecklistSummaryListContract,
      ),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && canExit,
    ...INLINE_READ_ERROR,
  });
}

export function myResignationsQueryOptions() {
  return {
    queryKey: humanResourcesQueryKeys.hr.exitMine(),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      apiClient.get("/me/resignations", undefined, signal, _resignationListContract),
    staleTime: 60_000,
  } as const;
}

export function useMyResignations() {
  return useGatedQuery("self:resignation", myResignationsQueryOptions());
}

export function useSubmitMyResignation() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<Resignation, Error, ResignationSubmission>("self:resignation", {
    mutationKey: ["me", "resignations", "create"],
    mutationFn: (data, idempotencyKey) =>
      apiClient.post("/me/resignations", data, { headers: { [IDEMPOTENCY_HEADER]: idempotencyKey } }, _resignationContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.exitAll }),
  });
}

export function useWithdrawMyResignation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("self:resignation", {
    mutationKey: ["me", "resignations", "withdraw"],
    mutationFn: ({ resignationId }: { resignationId: number }) =>
      apiClient.patch(`/me/resignations/${resignationId}/withdraw`, {}, undefined, _successContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.exitAll }),
  });
}

export function useAdminRecordResignation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:exit:manage", {
    mutationKey: ["hr", "exit", "admin-record"],
    mutationFn: (data: {
      targetUserId: string;
      reason: string;
      reasonCategory?: string;
      lastWorkingDate: string;
      noticePeriodDays?: number;
      willingForExitInterview?: boolean;
      companyFeedback?: string;
      resignationLetterUrl?: string;
    }) => apiClient.post("/hr/exit/admin-record", data, undefined, _resignationContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.exitAll }),
  });
}

export function useHrReviewResignation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:exit:manage", {
    mutationKey: ["hr", "exit", "hr-review"],
    mutationFn: ({ exitId, action, remarks }: { exitId: number; action: "approve" | "reject"; remarks?: string }) =>
      apiClient.patch(`/hr/exit/${exitId}/hr-review`, { decision: action, remarks }, undefined, _successContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.exitAll }),
  });
}

export function useFinalReviewResignation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:exit:approve", {
    mutationKey: ["hr", "exit", "final-review"],
    mutationFn: ({ exitId, action, remarks }: { exitId: number; action: "approve" | "reject"; remarks?: string }) =>
      apiClient.patch(`/hr/exit/${exitId}/final-review`, { decision: action, remarks }, undefined, _successContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.exitAll }),
  });
}

export function useWithdrawResignation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:exit:view", {
    mutationKey: ["hr", "exit", "withdraw"],
    mutationFn: ({ exitId }: { exitId: number }) =>
      apiClient.patch(`/hr/exit/${exitId}/withdraw`, {}, undefined, _successContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.exitAll }),
  });
}

export function exitDetailQueryOptions(resignationId: number) {
  return {
    queryKey: humanResourcesQueryKeys.hr.exitDetail(resignationId),
    staleTime: 60_000,
  } as const;
}

export function useResignation(resignationId: number) {
  const canView = useCan("hr:exit:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    ...exitDetailQueryOptions(resignationId),
    queryFn: ({ signal }) =>
      apiClient.get(`/hr/exit/${resignationId}`, undefined, signal, _resignationDetailContract),
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
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.exitDetail(variables.resignationId) });
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.exitList() });
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
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.exitDetail(variables.exitId) });
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.exitList() });
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
    queryKey: humanResourcesQueryKeys.hr.exitProgress(resignationId),
    queryFn: ({ signal }) =>
      apiClient.get(`/hr/exit/${resignationId}/progress`, undefined, signal, _resignationProgressContract),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && canView && resignationId > 0 && enabled,
  });
}
