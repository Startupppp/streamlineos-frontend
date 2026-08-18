"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan, useModuleEnabled } from "@/hooks/api/access";

export type ProbationStatus = "in_probation" | "review_due" | "extended" | "confirmed" | "terminated";

export interface ProbationReview {
  id: number;
  orgId: string;
  employmentId: number;
  personId: number;
  probationEndDate: string;
  status: ProbationStatus;
  extensionCount: number;
  extendedUntil: string | null;
  confirmedAt: string | null;
  createdAt: string;
  firstName: string;
  lastName: string;
  workEmail: string;
}

const probationKeys = {
  all: [...queryKeys.hr.all, "probation"] as const,
  list: (params: ProbationListParams) => [...queryKeys.hr.all, "probation", "list", params] as const,
};

export interface ProbationListParams {
  cursor?: string;
  limit?: number;
}

export interface ProbationListResponse {
  data: ProbationReview[];
  pageInfo: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export function useProbationList(params: ProbationListParams = {}) {
  const canProbation = useCan("hr:probation:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<ProbationListResponse>({
    queryKey: probationKeys.list(params),
    queryFn: () => {
      const searchParams = new URLSearchParams();
      searchParams.set("limit", String(params.limit ?? 20));
      if (params.cursor) searchParams.set("cursor", params.cursor);
      return apiClient.get<ProbationListResponse>(`/hr/probation?${searchParams.toString()}`);
    },
    staleTime: 60_000,
    enabled: hrEnabled && canProbation,
  });
}

export function useExtendProbation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "probation", "extend"],
    mutationFn: ({
      reviewId,
      extendedUntil,
      reason,
    }: {
      reviewId: number;
      extendedUntil: string;
      reason?: string;
    }) =>
      apiClient.post<ProbationReview>(`/hr/probation/${reviewId}/extend`, {
        extendedUntil,
        reason,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: probationKeys.all });
    },
  });
}

export function useConfirmProbation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "probation", "confirm"],
    mutationFn: ({
      reviewId,
      confirmedAt,
      notes,
    }: {
      reviewId: number;
      confirmedAt?: string;
      notes?: string;
    }) =>
      apiClient.post<ProbationReview>(`/hr/probation/${reviewId}/confirm`, {
        confirmedAt,
        notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: probationKeys.all });
    },
  });
}
