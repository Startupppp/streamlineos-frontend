"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import type { FallbackOrder, ReportingManagerPolicy } from "@/hooks/api/hr/reporting-lines-schema";

const policyLazy = lazyContract(() =>
  import("@/hooks/api/hr/reporting-lines-schema").then((m) => m.reportingManagerPolicyContract),
);

/** Read by the settings page and every onboarding/import entry point (policy-missing warning). */
export function useReportingManagerPolicy(options?: { enabled?: boolean }) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.reportingManagerPolicy(),
    queryFn: ({ signal }) =>
      apiClient.get<ReportingManagerPolicy>("/hr/reporting-manager-policy", undefined, signal, policyLazy),
    enabled: hrEnabled && canView && (options?.enabled ?? true),
    staleTime: 5 * 60_000,
    ...INLINE_READ_ERROR,
  });
}

export interface UpdateReportingManagerPolicyInput {
  maxSecondaryManagersPerEmployee?: number;
  defaultPrimaryManagerUserId?: string | null;
  fallbackOrder?: FallbackOrder;
  requireReasonAfterChanges?: number;
  allowTopLevelWithoutManager?: boolean;
  expectedVersion: number;
}

export function useUpdateReportingManagerPolicy() {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("hr:reporting-lines:override", {
    mutationKey: ["hr", "reportingManagerPolicy", "update"],
    mutationFn: (input: UpdateReportingManagerPolicyInput) =>
      apiClient.patch<ReportingManagerPolicy>(
        "/hr/reporting-manager-policy",
        input,
        operation.configFor(input),
        policyLazy,
      ),
    onSuccess: (policy) => {
      operation.settle();
      qc.setQueryData(humanResourcesQueryKeys.hr.reportingManagerPolicy(), policy);
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.managerCoverage() });
    },
  });
}
