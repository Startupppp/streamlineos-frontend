"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { downloadBlob } from "@/lib/download-blob";

const taxDeclarationListC = lazyContract(() =>
  import("@/hooks/api/payroll/tax-schema").then(
    (m) => m.taxDeclarationListContract,
  ),
);
const taxDeclarationRowC = lazyContract(() =>
  import("@/hooks/api/payroll/tax-schema").then(
    (m) => m.taxDeclarationRowContract,
  ),
);

export function useTaxDeclarationsAdmin(params: {
  financialYear?: string;
  status?: string;
}) {
  const canView = useCan("payroll:tax:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.taxDeclarations(
      params,
    ),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/payroll/tax/declarations",
        params,
        signal,
        taxDeclarationListC,
      ),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useApproveDeclaration() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:tax:manage", {
    mutationKey: ["payroll", "tax-declarations", "approve"],
    mutationFn: ({ declarationId }: { declarationId: number }) =>
      apiClient.patch(
        `/payroll/tax/declarations/${declarationId}/approve`,
        undefined,
        undefined,
        taxDeclarationRowC,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: payrollQueryKeys.payroll.taxDeclarationsAll,
      });
    },
  });
}

export function useRejectDeclaration() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:tax:manage", {
    mutationKey: ["payroll", "tax-declarations", "reject"],
    mutationFn: ({
      declarationId,
      note,
    }: {
      declarationId: number;
      note?: string;
    }) =>
      apiClient.patch(
        `/payroll/tax/declarations/${declarationId}/reject`,
        { note },
        undefined,
        taxDeclarationRowC,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: payrollQueryKeys.payroll.taxDeclarationsAll,
      });
    },
  });
}

export function useExportTaxReport() {
  return useAuthorizedMutation("payroll:reports:export", {
    mutationKey: ["payroll", "tax-declarations", "export"],
    mutationFn: async ({ financialYear }: { financialYear: string }) => {
      const blob = await apiClient.download("/payroll/tax/export", {
        financialYear,
        format: "csv",
      });
      downloadBlob(blob, `tax-declarations-${financialYear}.csv`);
    },
  });
}
