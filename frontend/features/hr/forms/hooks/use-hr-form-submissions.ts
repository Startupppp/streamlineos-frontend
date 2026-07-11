"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  HrFormSubmission,
  HrFormSubmissionListResponse,
  HrFormSubmissionStatus,
  SubmitHrFormPayload,
} from "../lib/types";

function submissionsKey(formId: number, params?: Record<string, unknown>) {
  return params
    ? ["hr", "forms", formId, "submissions", params]
    : ["hr", "forms", formId, "submissions"];
}

export function useHrFormSubmissions(
  formId: number,
  params?: { page?: number; limit?: number; status?: HrFormSubmissionStatus },
) {
  return useQuery<HrFormSubmissionListResponse>({
    queryKey: submissionsKey(formId, params),
    queryFn: () => {
      const p: Record<string, unknown> = {};
      if (params?.page) p["page"] = params.page;
      if (params?.limit) p["limit"] = params.limit;
      if (params?.status) p["status"] = params.status;
      return apiClient.get<HrFormSubmissionListResponse>(`/hr/forms/${formId}/submissions`, p);
    },
    staleTime: 15_000,
  });
}

export function useMyHrSubmissions() {
  return useQuery<HrFormSubmission[]>({
    queryKey: ["hr", "forms", "submissions", "my"],
    queryFn: () => apiClient.get<HrFormSubmission[]>("/hr/forms/submissions/my"),
    staleTime: 30_000,
  });
}

export function useSubmitHrForm(formId: number) {
  const qc = useQueryClient();
  return useMutation<HrFormSubmission, Error, SubmitHrFormPayload>({
    mutationKey: ["hr", "forms", formId, "submit"],
    mutationFn: (payload) =>
      apiClient.post<HrFormSubmission>(`/hr/forms/${formId}/submissions`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: submissionsKey(formId) }),
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
