"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import type { AssessmentView } from "@/hooks/api/hr/recruitment/assessments-schema";

export type { AssessmentView };

const listC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/assessments-schema").then((m) => m.assessmentListContract),
);
const viewC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/assessments-schema").then((m) => m.assessmentViewContract),
);

const assessmentsKey = (candidateId: number) =>
  ["hr", "recruitment", "candidates", candidateId, "assessments"] as const;

export function useCandidateAssessments(candidateId: number) {
  return useGatedQuery("hr:requisitions:view", {
    queryKey: assessmentsKey(candidateId),
    queryFn: ({ signal }) =>
      apiClient.get<AssessmentView[]>(
        `/hr/recruitment/candidates/${candidateId}/assessments`,
        undefined,
        signal,
        listC,
      ),
    staleTime: 60_000,
  });
}

export function useInviteAssessment(candidateId: number) {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "candidates", candidateId, "assessments", "invite"],
    mutationFn: (testId: string, idempotencyKey: string) =>
      apiClient.post<AssessmentView>(
        `/hr/recruitment/candidates/${candidateId}/assessments`,
        { testId },
        { headers: { "Idempotency-Key": idempotencyKey } },
        viewC,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: assessmentsKey(candidateId) }),
  });
}
