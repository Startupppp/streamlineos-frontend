"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { downloadBlob } from "@/lib/download-blob";
import type { FnfStatement } from "@/types/payroll/reports";

const fnfInsightsListC = lazyContract(() =>
  import("@/hooks/api/payroll/fnf-schema").then((m) => m.fnfInsightsListContract),
);
const fnfGetOneC = lazyContract(() =>
  import("@/hooks/api/payroll/fnf-schema").then((m) => m.fnfGetOneContract),
);
const fnfStatementC = lazyContract(() =>
  import("@/hooks/api/payroll/fnf-schema").then((m) => m.fnfStatementContract),
);
const updateFnfResultC = lazyContract(() =>
  import("@/hooks/api/payroll/fnf-schema").then((m) => m.updateFnfResultContract),
);

export function useFnfSettlements() {
  const canView = useCan("payroll:fnf:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.fnfList(),
    queryFn: async ({ signal }) =>
      (await apiClient.get("/payroll/fnf", undefined, signal, fnfInsightsListC)).items,
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useFnfSettlement(settlementId: number) {
  const canView = useCan("payroll:fnf:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.fnfSettlement(settlementId),
    queryFn: ({ signal }) => apiClient.get(`/payroll/fnf/${settlementId}`, undefined, signal, fnfGetOneC),
    staleTime: 60_000,
    enabled: canView && settlementId > 0,
  });
}

export function useFnfStatement(settlementId: number) {
  const canView = useCan("payroll:fnf:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.fnfStatement(settlementId),
    queryFn: ({ signal }) =>
      apiClient.get<FnfStatement>(`/payroll/fnf/${settlementId}/statement`, undefined, signal, fnfStatementC),
    staleTime: 60_000,
    enabled: canView && settlementId > 0,
  });
}

export async function downloadFnfStatement(
  settlementId: number,
): Promise<void> {
  const blob = await apiClient.download(
    `/payroll/fnf/${settlementId}/statement/download`,
  );
  downloadBlob(blob, `Final_settlement_statement_${settlementId}.pdf`);
}

export function useApproveFnf() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:fnf:manage", {
    mutationKey: ["payroll", "fnf", "approve"],
    mutationFn: ({
      settlementId,
      notes,
    }: {
      settlementId: number;
      notes?: string;
    }) =>
      apiClient.post(`/payroll/fnf/${settlementId}/approve`, { status: "APPROVED", notes }, undefined, updateFnfResultC),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.fnfAll });
    },
  });
}
