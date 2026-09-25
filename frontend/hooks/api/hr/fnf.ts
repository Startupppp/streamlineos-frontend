"use client";

import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { UseMutationOptions, UseQueryOptions } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import type { OffsetPage } from "@/hooks/api/offset-page-schema";

export interface FnfSettlement {
  id: number;
  orgId: string;
  userId: string;
  resignationId: number | null;
  basicDues: string;
  leaveEncashment: string;
  bonusDue: string;
  deductions: string;
  loanRecovery: string;
  netPayable: string;
  status: string;
  userMembershipId: number | null;
  approvedBy: string | null;
  notes: string | null;
  reimbursementsDue: string;
  assetRecovery: string;
  noticeRecovery: string;
  otherDeductions: string;
  statementPublishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { name: string | null; email: string } | null;
}

export interface CreateFnfSettlementInput {
  userId: string;
  basicDues?: number;
  leaveEncashment?: number;
  bonusDue?: number;
  deductions?: number;
  loanRecovery?: number;
  notes?: string;
}

export function useFnfSettlements(
  options?: Omit<UseQueryOptions<FnfSettlement[], Error>, "queryKey" | "queryFn">,
) {
  const canView = useCan("hr:payroll:view");
  return useQuery<FnfSettlement[], Error>({
    queryKey: humanResourcesQueryKeys.hr.fnfList(),
    queryFn: async ({ signal }) =>
      (await apiClient.get<OffsetPage<FnfSettlement>>("/hr/fnf", undefined, signal, lazyContract(() => import("@/hooks/api/hr/fnf-schema").then(m => m.fnfListContract)))).items,
    staleTime: 30_000,
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
}

export function useCreateFnfSettlement(
  options?: UseMutationOptions<FnfSettlement, Error, CreateFnfSettlementInput>,
) {
  const qc = useQueryClient();
  return useAuthorizedMutation<FnfSettlement, Error, CreateFnfSettlementInput>("hr:exit:manage", {
    mutationKey: ["hr", "fnf", "create"],
    mutationFn: (data: CreateFnfSettlementInput) =>
      apiClient.post<FnfSettlement>("/hr/fnf", data, undefined, lazyContract(() => import("@/hooks/api/hr/fnf-schema").then(m => m.fnfRowContract))),
    ...options,
    onSuccess: (data, variables, context, mutFnCtx) => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.fnfList() });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}

export function useCompleteFnfSettlement(
  options?: UseMutationOptions<{ success: boolean }, Error, number>,
) {
  const qc = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, number>("hr:exit:manage", {
    mutationKey: ["hr", "fnf", "complete"],
    mutationFn: (fnfId: number) =>
      apiClient.patch<{ success: boolean }>(`/hr/fnf/${fnfId}`, { status: "PAID" }, undefined, lazyContract(() => import("@/hooks/api/hr/fnf-schema").then(m => m.successResponseContract))),
    ...options,
    onSuccess: (data, variables, context, mutFnCtx) => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.fnfList() });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}
