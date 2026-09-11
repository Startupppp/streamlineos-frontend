"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import type { HrProbationReviewRow } from "@/hooks/api/hr/probation-schema";

const probationListC = lazyContract(() =>
  import("@/hooks/api/hr/probation-schema").then((m) => m.probationListContract),
);
const extendProbationC = lazyContract(() =>
  import("@/hooks/api/hr/probation-schema").then((m) => m.extendProbationContract),
);
const confirmProbationC = lazyContract(() =>
  import("@/hooks/api/hr/probation-schema").then((m) => m.confirmProbationContract),
);

export type ProbationStatus = "in_probation" | "review_due" | "extended" | "confirmed" | "terminated";

export interface ProbationReview {
  id: number;
  orgId: string;
  employmentId: number;
  personId: number;
  probationEndDate: string;
  status: string;
  extensionCount: number;
  extendedUntil: string | null;
  confirmedAt: string | null;
  createdAt: string;
  firstName: string | null;
  lastName: string | null;
  workEmail: string | null;
}

const probationKeys = {
  all: [...humanResourcesQueryKeys.hr.all, "probation"] as const,
  list: (params: ProbationListParams) => [...humanResourcesQueryKeys.hr.all, "probation", "list", params] as const,
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
    queryFn: ({ signal }) => {
      const searchParams = new URLSearchParams();
      searchParams.set("limit", String(params.limit ?? 20));
      if (params.cursor) searchParams.set("cursor", params.cursor);
      return apiClient.get<ProbationListResponse>(`/hr/probation?${searchParams.toString()}`, undefined, signal, probationListC);
    },
    staleTime: 60_000,
    enabled: hrEnabled && canProbation,
  });
}

export function useExtendProbation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:probation:manage", {
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
      apiClient.post<HrProbationReviewRow>(`/hr/probation/${reviewId}/extend`, {
        extendedUntil,
        reason,
      }, undefined, extendProbationC),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: probationKeys.all });
    },
  });
}

export function useConfirmProbation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:probation:manage", {
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
      apiClient.post<HrProbationReviewRow>(`/hr/probation/${reviewId}/confirm`, {
        confirmedAt,
        notes,
      }, undefined, confirmProbationC),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: probationKeys.all });
    },
  });
}
