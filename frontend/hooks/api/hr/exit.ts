"use client";
import type { z } from "zod";
import type { resignationContract } from "@/hooks/api/hr/exit-schema";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export type Resignation = z.infer<typeof resignationContract>;

interface ResignationProgressStep {
  step: string;
  label: string;
  status: "completed" | "current" | "pending";
  timestamp?: string;
}

export interface ResignationProgress {
  label: string;
  status: "completed" | "active" | "rejected" | "pending";
  actor: string | null;
  timestamp: string | null;
  remarks: string | null;
  steps: ResignationProgressStep[];
}

export interface PaginatedResignations {
  data: Resignation[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface ResignationListParams {
  page?: number;
  limit?: number;
  status?: string;
}

const exitKeys = {
  all: [...humanResourcesQueryKeys.hr.all, "exit"] as const,
  list: (params?: ResignationListParams) => [...exitKeys.all, "list", params] as const,
  progress: (resignationId: number) =>
    [...exitKeys.all, "progress", resignationId] as const,
};

const _resignationListContract = lazyContract(() =>
  import("@/hooks/api/hr/exit-schema").then((m) => m.resignationListContract),
);
const _resignationContract = lazyContract(() =>
  import("@/hooks/api/hr/exit-schema").then((m) => m.resignationContract),
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
      if (params?.page) search.set("page", String(params.page));
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
    onSuccess: () => qc.invalidateQueries({ queryKey: exitKeys.list() }),
  });
}

export function useHrReviewResignation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:exit:manage", {
    mutationKey: ["hr", "exit", "hr-review"],
    mutationFn: ({ id, action, remarks }: { id: number; action: "approve" | "reject"; remarks?: string }) =>
      apiClient.patch(`/hr/exit/${id}/hr-review`, { decision: action, remarks }, undefined, _successContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: exitKeys.list() }),
  });
}

export function useFinalReviewResignation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:exit:approve", {
    mutationKey: ["hr", "exit", "final-review"],
    mutationFn: ({ id, action, remarks }: { id: number; action: "approve" | "reject"; remarks?: string }) =>
      apiClient.patch(`/hr/exit/${id}/final-review`, { decision: action, remarks }, undefined, _successContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: exitKeys.list() }),
  });
}

export function useWithdrawResignation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:exit:view", {
    mutationKey: ["hr", "exit", "withdraw"],
    mutationFn: ({ id }: { id: number }) =>
      apiClient.patch(`/hr/exit/${id}/withdraw`, {}, undefined, _successContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: exitKeys.list() }),
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
