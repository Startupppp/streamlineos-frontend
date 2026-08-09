"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

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
  list: () => [...queryKeys.hr.all, "probation", "list"] as const,
};

export function useProbationList() {
  const canProbation = useCan("hr:probation:view");
  return useQuery<ProbationReview[]>({
    queryKey: probationKeys.list(),
    queryFn: () => apiClient.get<ProbationReview[]>("/hr/probation"),
    staleTime: 60_000,
    enabled: canProbation,
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
      qc.invalidateQueries({ queryKey: probationKeys.list() });
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
      qc.invalidateQueries({ queryKey: probationKeys.list() });
    },
  });
}
