"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export interface InternalJob {
  id: number;
  title: string;
  departmentId: string | null;
  location: string | null;
  type: string;
  experience: string | null;
  description: string | null;
  requirements: string | null;
  openings: number;
  applicationDeadline: string | null;
  createdAt: string;
  department?: { id: string; name: string } | null;
}

export function useInternalJobs() {
  const can = useCan("hr:employees:view");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.hrInternalJobs,
    queryFn: ({ signal }) =>
      apiClient.get<InternalJob[]>("/hr/recruitment/internal-jobs", undefined, signal),
    staleTime: 2 * 60_000,
    enabled: can,
  });
}

export function useApplyToInternalJob(jobId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<unknown, Error, { coverLetter?: string }>(
    "hr:employees:view",
    {
      mutationKey: ["hr", "recruitment", "internal-jobs", "apply", jobId],
      mutationFn: (data) =>
        apiClient.post(`/hr/recruitment/internal-jobs/${jobId}/apply`, data),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hrInternalJobs });
      },
    },
  );
}
