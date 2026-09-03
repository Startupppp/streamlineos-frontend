"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { OffsetPage } from "@/hooks/api/offset-page-schema";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { downloadBlob } from "@/lib/download-blob";
import type { FnfSettlement, FnfStatement } from "@/types/payroll/reports";

export function useFnfSettlements() {
  const canView = useCan("payroll:fnf:view");
  return useQuery({
    queryKey: queryKeys.payroll.fnfList(),
    queryFn: async ({ signal }) =>
      (await apiClient.get<OffsetPage<FnfSettlement>>("/payroll/fnf", undefined, signal)).items,
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useFnfSettlement(settlementId: number) {
  const canView = useCan("payroll:fnf:view");
  return useQuery({
    queryKey: queryKeys.payroll.fnfSettlement(settlementId),
    queryFn: ({ signal }) => apiClient.get<FnfSettlement>(`/payroll/fnf/${settlementId}`, undefined, signal),
    staleTime: 60_000,
    enabled: canView && settlementId > 0,
  });
}

export function useFnfStatement(settlementId: number) {
  const canView = useCan("payroll:fnf:view");
  return useQuery({
    queryKey: queryKeys.payroll.fnfStatement(settlementId),
    queryFn: ({ signal }) =>
      apiClient.get<FnfStatement>(`/payroll/fnf/${settlementId}/statement`, undefined, signal),
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
  downloadBlob(blob, `FNF_Statement_${settlementId}.pdf`);
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
      apiClient.post<FnfSettlement>(`/payroll/fnf/${settlementId}/approve`, {
        status: "APPROVED",
        notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payroll.fnfAll });
    },
  });
}
