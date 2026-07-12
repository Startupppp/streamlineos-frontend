"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export function useBillSubmitApproval(billId: number) {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; status: string }, Error, { note?: string }>({
    mutationKey: ["bill-submit-approval", billId],
    mutationFn: (body) =>
      apiClient.post<{ id: number; status: string }>(
        `/accounting/purchase-bills/${billId}/submit-approval`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.purchaseBill(billId) });
    },
  });
}

export function useBillApprove(billId: number) {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; status: string }, Error, void>({
    mutationKey: ["bill-approve", billId],
    mutationFn: () =>
      apiClient.post<{ id: number; status: string }>(
        `/accounting/purchase-bills/${billId}/approve`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.purchaseBill(billId) });
    },
  });
}

export function useBillCancel(billId: number) {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; status: string }, Error, { reason?: string }>({
    mutationKey: ["bill-cancel", billId],
    mutationFn: (body) =>
      apiClient.post<{ id: number; status: string }>(
        `/accounting/purchase-bills/${billId}/cancel`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.purchaseBill(billId) });
    },
  });
}

export * from "./ap-vendors";
export * from "./ap-payment-runs";
