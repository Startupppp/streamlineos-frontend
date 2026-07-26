"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { TaxDeclarationAdmin } from "@/types/payroll/reports";

export function useTaxDeclarationsAdmin(params: {
  financialYear?: string;
  status?: string;
}) {
  const canView = useCan("payroll:tax:view");
  return useQuery({
    queryKey: queryKeys.payroll.taxDeclarations(params as Record<string, unknown> | undefined),
    queryFn: () => apiClient.get<TaxDeclarationAdmin[]>("/payroll/tax/declarations", params),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useApproveDeclaration() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "tax-declarations", "approve"],
    mutationFn: ({ declarationId }: { declarationId: number }) =>
      apiClient.patch<TaxDeclarationAdmin>(
        `/payroll/tax/declarations/${declarationId}/approve`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payroll.taxDeclarationsAll });
    },
  });
}

export function useRejectDeclaration() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "tax-declarations", "reject"],
    mutationFn: ({ declarationId, note }: { declarationId: number; note?: string }) =>
      apiClient.patch<TaxDeclarationAdmin>(
        `/payroll/tax/declarations/${declarationId}/reject`,
        { note },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payroll.taxDeclarationsAll });
    },
  });
}

export function useExportTaxReport() {
  return useMutation({
    mutationKey: ["payroll", "tax-declarations", "export"],
    mutationFn: async ({ financialYear }: { financialYear: string }) => {
      const blob = await apiClient.download("/payroll/tax/export", {
        financialYear,
        format: "csv",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tax-declarations-${financialYear}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
}
