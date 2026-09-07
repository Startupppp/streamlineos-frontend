"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import type { PayslipPublication, PublishResult } from "@/types/payroll";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const publicationListC = lazyContract(() =>
  import("@/hooks/api/payroll/publications-schema").then((m) => m.publicationListContract),
);
const publishResponseC = lazyContract(() =>
  import("@/hooks/api/payroll/publications-schema").then((m) => m.publishResponseContract),
);

export function useRunPublications(runId: number) {
  const canView = useCan("payroll:payslips:view");
  return useQuery<PayslipPublication[]>({
    queryKey: payrollQueryKeys.payroll.runPublications(runId),
    queryFn: ({ signal }) =>
      apiClient.get<PayslipPublication[]>(`/payroll/runs/${runId}/payslips`, undefined, signal, publicationListC),
    staleTime: 30_000,
    enabled: canView && runId > 0,
  });
}

export function usePublishPayslips() {
  const qc = useQueryClient();
  return useAuthorizedMutation<PublishResult, Error, { runId: number; userIds?: string[] }>("payroll:payslips:manage", {
    mutationKey: ["payroll", "publish-payslips"],
    mutationFn: ({ runId, userIds }) =>
      apiClient.post<PublishResult>(`/payroll/runs/${runId}/payslips/publish`, {
        userIds,
      }, undefined, publishResponseC),
    onSuccess: (_, { runId }) => {
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.runPublications(runId) });
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.run(runId) });
      void qc.invalidateQueries({ queryKey: [...payrollQueryKeys.payroll.all, "runs"] });
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.essPayslips() });
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.commandCenterAll });
      // Publishing drives the run to PAYSLIPS_PUBLISHED, a locked status, so
      // the `provisional` flag every payroll report carries flips with it.
      void qc.invalidateQueries({ queryKey: [...payrollQueryKeys.payroll.all, "reports"] });
    },
  });
}

export async function downloadPayslipPdf(publicationId: number): Promise<void> {
  try {
    const blob = await apiClient.download(`/payroll/payslips/${publicationId}/download`);
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}
