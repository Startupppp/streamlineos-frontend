"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { FnfSettlement, FnfStatement } from "@/types/payroll/reports";

export const fnfKeys = {
  all: ["payroll", "fnf"] as const,
  list: () => ["payroll", "fnf", "list"] as const,
  settlement: (id: number) => ["payroll", "fnf", id] as const,
  statement: (id: number) => ["payroll", "fnf", id, "statement"] as const,
};

export function useFnfSettlements() {
  return useQuery({
    queryKey: fnfKeys.list(),
    queryFn: () => apiClient.get<FnfSettlement[]>("/payroll/fnf"),
    staleTime: 60_000,
  });
}

export function useFnfSettlement(settlementId: number) {
  return useQuery({
    queryKey: fnfKeys.settlement(settlementId),
    queryFn: () => apiClient.get<FnfSettlement>(`/payroll/fnf/${settlementId}`),
    staleTime: 60_000,
  });
}

export function useFnfStatement(settlementId: number) {
  return useQuery({
    queryKey: fnfKeys.statement(settlementId),
    queryFn: () =>
      apiClient.get<FnfStatement>(`/payroll/fnf/${settlementId}/statement`),
    staleTime: 60_000,
  });
}

export async function downloadFnfStatement(settlementId: number): Promise<void> {
  const blob = await apiClient.download(`/payroll/fnf/${settlementId}/statement/download`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `FNF_Statement_${settlementId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function useApproveFnf() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "fnf", "approve"],
    mutationFn: ({
      settlementId,
      notes,
    }: {
      settlementId: number;
      notes?: string;
    }) =>
      apiClient.post<FnfSettlement>(`/payroll/fnf/${settlementId}/approve`, {
        notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fnfKeys.all });
    },
  });
}
