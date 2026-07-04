"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { TaxDeclarationAdmin } from "@/types/payroll/reports";

export const taxAdminKeys = {
  all: ["payroll", "tax-declarations"] as const,
  list: (params: Record<string, string | undefined>) =>
    ["payroll", "tax-declarations", params] as const,
};

export function useTaxDeclarationsAdmin(params: {
  financialYear?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: taxAdminKeys.list(params as Record<string, string | undefined>),
    queryFn: () => apiClient.get<TaxDeclarationAdmin[]>("/payroll/tax/declarations", params),
    staleTime: 60_000,
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
      qc.invalidateQueries({ queryKey: taxAdminKeys.all });
    },
  });
}

export function useRejectDeclaration() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "tax-declarations", "reject"],
    mutationFn: ({ declarationId }: { declarationId: number }) =>
      apiClient.patch<TaxDeclarationAdmin>(
        `/payroll/tax/declarations/${declarationId}/reject`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taxAdminKeys.all });
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
