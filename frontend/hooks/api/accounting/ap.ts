"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { billStatusUpdateContract } from "@/hooks/api/accounting/accounting-schema";

export function useBillSubmitApproval(billId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("accounting:payables:manage", {
    mutationKey: ["bill-submit-approval", billId],
    mutationFn: (body: { note?: string }) =>
      apiClient.post(
        `/accounting/purchase-bills/${billId}/submit-approval`,
        body, undefined, billStatusUpdateContract,
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
      apiClient.post(
        `/accounting/purchase-bills/${billId}/approve`,
        undefined, undefined, billStatusUpdateContract,
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
      apiClient.post(
        `/accounting/purchase-bills/${billId}/cancel`,
        body, undefined, billStatusUpdateContract,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.all });
      queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.purchaseBill(billId) });
    },
  });
}

export * from "./ap-vendors";
export * from "./ap-payment-runs";
