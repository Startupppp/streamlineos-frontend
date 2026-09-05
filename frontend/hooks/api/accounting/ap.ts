"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export function useBillSubmitApproval(billId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("accounting:payables:manage", {
    mutationKey: ["bill-submit-approval", billId],
    mutationFn: (body: { note?: string }) =>
      apiClient.post<{ id: number; status: string }>(
        `/accounting/purchase-bills/${billId}/submit-approval`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.all });
      queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.purchaseBill(billId) });
    },
  });
}

export function useBillApprove(billId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("accounting:payables:approve", {
    mutationKey: ["bill-approve", billId],
    mutationFn: () =>
      apiClient.post<{ id: number; status: string }>(
        `/accounting/purchase-bills/${billId}/approve`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.all });
      queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.purchaseBill(billId) });
    },
  });
}

export function useBillCancel(billId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("accounting:payables:manage", {
    mutationKey: ["bill-cancel", billId],
    mutationFn: (body: { reason?: string }) =>
      apiClient.post<{ id: number; status: string }>(
        `/accounting/purchase-bills/${billId}/cancel`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.all });
      queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.purchaseBill(billId) });
    },
  });
}

export * from "./ap-vendors";
export * from "./ap-payment-runs";
