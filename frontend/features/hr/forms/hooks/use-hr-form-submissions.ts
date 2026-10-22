"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import type {
  HrFormSubmissionStatus,
} from "../lib/types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { hrFormSubmissionsListKey } from "@/features/hr/forms/hooks/hr-forms-schema";
import { hrFormSubmissionsQueryOptions } from "@/features/hr/forms/hooks/use-hr-form-submissions-read-options";

const formSubmissionListContract = lazyContract(() =>
  import("@/features/hr/forms/hooks/hr-forms-schema").then((m) => m.hrFormSubmissionListContract),
);
const formSubmissionRowContract = lazyContract(() =>
  import("@/features/hr/forms/hooks/hr-forms-schema").then((m) => m.hrFormSubmissionRowContract),
);

export function useHrFormSubmissions(
  formId: number,
  params?: { cursor?: string; limit?: number; status?: HrFormSubmissionStatus },
) {
  const canViewForms = useCan("hr:forms:view");
  return useQuery({
    ...hrFormSubmissionsQueryOptions(formId, params),
    queryFn: ({ signal }) => {
      const p: Record<string, unknown> = {};
      if (params?.cursor) p["cursor"] = params.cursor;
      if (params?.limit) p["limit"] = params.limit;
      if (params?.status) p["status"] = params.status;
      return apiClient.get(`/hr/forms/${formId}/submissions`, p, signal, formSubmissionListContract);
    },
    enabled: canViewForms,
  });
}

export function useUpdateSubmissionStatus(formId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    unknown,
    Error,
    { submissionId: number; status: HrFormSubmissionStatus }
  >("hr:forms:manage", {
    mutationKey: ["hr", "forms", "submission", "status"],
    mutationFn: ({ submissionId, status }) =>
      apiClient.patch(`/hr/forms/submissions/${submissionId}/status`, { status }, undefined, formSubmissionRowContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrFormSubmissionsListKey(formId) }),
  });
}
