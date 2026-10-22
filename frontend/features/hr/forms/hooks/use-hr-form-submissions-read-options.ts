import { hrFormSubmissionsListKey } from "@/features/hr/forms/hooks/hr-forms-schema";
import type { HrFormSubmissionStatus } from "../lib/types";

export function hrFormSubmissionsQueryOptions(
  formId: number,
  params?: { cursor?: string; limit?: number; status?: HrFormSubmissionStatus },
) {
  return {
    queryKey: hrFormSubmissionsListKey(formId, params),
    staleTime: 15_000,
  } as const;
}
