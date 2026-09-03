"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import type {
  HrFormSubmission,
  HrFormSubmissionListResponse,
  HrFormSubmissionStatus,
} from "../lib/types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

function submissionsKey(formId: number, params?: Record<string, unknown>) {
  return params
    ? ["hr", "forms", formId, "submissions", params]
    : ["hr", "forms", formId, "submissions"];
}

export function useHrFormSubmissions(
  formId: number,
  params?: { cursor?: string; limit?: number; status?: HrFormSubmissionStatus },
) {
  const canViewForms = useCan("hr:forms:view");
  return useQuery<HrFormSubmissionListResponse>({
    queryKey: submissionsKey(formId, params),
    queryFn: ({ signal }) => {
      const p: Record<string, unknown> = {};
      if (params?.cursor) p["cursor"] = params.cursor;
      if (params?.limit) p["limit"] = params.limit;
      if (params?.status) p["status"] = params.status;
      return apiClient.get<HrFormSubmissionListResponse>(`/hr/forms/${formId}/submissions`, p, signal);
    },
    staleTime: 15_000,
    enabled: canViewForms,
  });
}

export function useUpdateSubmissionStatus(formId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    HrFormSubmission,
    Error,
    { submissionId: number; status: HrFormSubmissionStatus }
  >("hr:forms:manage", {
    mutationKey: ["hr", "forms", "submission", "status"],
    mutationFn: ({ submissionId, status }) =>
      apiClient.patch<HrFormSubmission>(`/hr/forms/submissions/${submissionId}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: submissionsKey(formId) }),
  });
}
