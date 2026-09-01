"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { PayslipPublication, PublishResult } from "@/types/payroll";
import { getErrorMessage } from "@/lib/get-error-message";

export function useRunPublications(runId: number) {
  const canView = useCan("payroll:payslips:view");
  return useQuery<PayslipPublication[]>({
    queryKey: queryKeys.payroll.runPublications(runId),
    queryFn: ({ signal }) =>
      apiClient.get<PayslipPublication[]>(`/payroll/runs/${runId}/payslips`, undefined, signal),
    staleTime: 30_000,
    enabled: canView && runId > 0,
  });
}

export function usePublishPayslips() {
  const qc = useQueryClient();
  return useMutation<PublishResult, Error, { runId: number; userIds?: string[] }>({
    mutationKey: ["payroll", "publish-payslips"],
    mutationFn: ({ runId, userIds }) =>
      apiClient.post<PublishResult>(`/payroll/runs/${runId}/payslips/publish`, {
        userIds,
      }),
    onSuccess: (_, { runId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.runPublications(runId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.run(runId) });
      void qc.invalidateQueries({ queryKey: [...queryKeys.payroll.all, "runs"] });
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
