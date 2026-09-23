"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type { SelfJobOpening } from "./job-openings-schema";

const jobOpeningsC = lazyContract(() =>
  import("@/hooks/api/employee-self-service/job-openings-schema").then(
    (m) => m.selfJobOpeningsContract,
  ),
);
const applicationC = lazyContract(() =>
  import("@/hooks/api/employee-self-service/job-openings-schema").then(
    (m) => m.selfJobApplicationContract,
  ),
);

const jobOpeningsKey = ["employee-self-service", "job-openings"] as const;

export interface ApplyToJobOpeningInput {
  jobId: number;
  coverLetter?: string;
  notes?: string;
}

export function useSelfJobOpenings() {
  return useGatedQuery<SelfJobOpening[]>("self:job-openings", {
    queryKey: jobOpeningsKey,
    queryFn: ({ signal }) =>
      apiClient.get<SelfJobOpening[]>(
        "/hr/recruitment/me/job-openings",
        undefined,
        signal,
        jobOpeningsC,
      ),
    staleTime: 60_000,
  });
}

export function useApplyToJobOpening() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ id: number }, Error, ApplyToJobOpeningInput>(
    "self:job-openings",
    {
      mutationKey: ["employee-self-service", "job-openings", "apply"],
      mutationFn: ({ jobId, coverLetter, notes }: ApplyToJobOpeningInput) =>
        apiClient.post<{ id: number }>(
          `/hr/recruitment/me/job-openings/${jobId}/apply`,
          { coverLetter, notes },
          undefined,
          applicationC,
        ),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: jobOpeningsKey });
      },
    },
  );
}
