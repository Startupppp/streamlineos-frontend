"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  HrFormSubmission,
  HrFormSubmissionListResponse,
  HrFormSubmissionStatus,
} from "../lib/types";

function submissionsKey(formId: number, params?: Record<string, unknown>) {
  return params
    ? ["hr", "forms", formId, "submissions", params]
    : ["hr", "forms", formId, "submissions"];
}

export function useHrFormSubmissions(
  formId: number,
  params?: { cursor?: string; limit?: number; status?: HrFormSubmissionStatus },
) {
  return useQuery<HrFormSubmissionListResponse>({
    queryKey: submissionsKey(formId, params),
    queryFn: () => {
      const p: Record<string, unknown> = {};
      if (params?.cursor) p["cursor"] = params.cursor;
      if (params?.limit) p["limit"] = params.limit;
      if (params?.status) p["status"] = params.status;
      return apiClient.get<HrFormSubmissionListResponse>(`/hr/forms/${formId}/submissions`, p);
    },
    staleTime: 15_000,
  });
}

export function useUpdateSubmissionStatus(formId: number) {
  const qc = useQueryClient();
  return useMutation<
    HrFormSubmission,
    Error,
    { submissionId: number; status: HrFormSubmissionStatus }
  >({
    mutationKey: ["hr", "forms", "submission", "status"],
    mutationFn: ({ submissionId, status }) =>
      apiClient.patch<HrFormSubmission>(`/hr/forms/submissions/${submissionId}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: submissionsKey(formId) }),
  });
}
