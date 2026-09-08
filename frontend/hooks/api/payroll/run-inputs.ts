"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { RunInput } from "@/types/payroll/runs";

const inputsListC = lazyContract(() =>
  import("@/hooks/api/payroll/run-inputs-schema").then((m) => m.inputsListContract),
);
const patchInputC = lazyContract(() =>
  import("@/hooks/api/payroll/run-inputs-schema").then((m) => m.patchInputResponseContract),
);
const reimportC = lazyContract(() =>
  import("@/hooks/api/payroll/run-inputs-schema").then((m) => m.reimportResponseContract),
);

interface PatchInputBody {
  scheduledDays?: string;
  paidDays?: string;
  lopDays?: string;
  overtimeHours?: string;
  billableHours?: string;
  reason: string;
}

export function useRunInputs(runId: number, params?: { userId?: string }) {
  const canView = useCan("payroll:runs:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.runInputs(runId, params),
    queryFn: ({ signal }) =>
      apiClient.get(`/payroll/runs/${runId}/inputs`, params, signal, inputsListC),
    staleTime: 30_000,
    enabled: canView && runId > 0,
  });
}

export function usePatchInput(runId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:runs:update", {
    mutationKey: ["payroll", "run-inputs", runId, "patch"],
    mutationFn: ({ inputId, body }: { inputId: number; body: PatchInputBody }) =>
      apiClient.patch<{ ok: boolean }>(`/payroll/runs/${runId}/inputs/${inputId}`, body, undefined, patchInputC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.runInputsAll(runId) });
    },
  });
}

export function useReimportInputs(runId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:runs:update", {
    mutationKey: ["payroll", "run-inputs", runId, "reimport"],
    mutationFn: () =>
      apiClient.post<{ ok: boolean; count: number }>(`/payroll/runs/${runId}/inputs/reimport`, undefined, undefined, reimportC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.runInputsAll(runId) });
    },
  });
}
