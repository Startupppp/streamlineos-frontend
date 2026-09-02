"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { CursorPage } from "@/hooks/api/accounting";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { queryKeyBase } from "@/lib/query-keys/base";

const apRunKeys = {
  paymentRuns: (params?: object) =>
    [...queryKeyBase, "accounting", "ap", "payment-runs", params] as const,
  paymentRun: (id: number) =>
    [...queryKeyBase, "accounting", "ap", "payment-runs", id] as const,
};

export type PaymentRunStatus = "DRAFT" | "APPROVED" | "COMPLETED" | "CANCELLED";
export type PaymentRunItemStatus = "PENDING" | "PAID" | "SKIPPED";

export interface PaymentRunSummary {
  id: number;
  orgId: string;
  name: string;
  scheduledDate: string | null;
  status: PaymentRunStatus;
  totalAmount: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRunItem {
  id: number;
  runId: number;
  billId: number;
  billNumber: string | null;
  vendorId: number | null;
  vendorName: string | null;
  amount: string;
  status: PaymentRunItemStatus;
  vendorPaymentId: number | null;
  dueDate: string | null;
}

export interface PaymentRunDetail extends PaymentRunSummary {
  items: PaymentRunItem[];
}

export interface ListPaymentRunsParams {
  cursor?: string;
  limit?: number;
  status?: PaymentRunStatus;
}



export interface CreatePaymentRunFilters {
  vendorIds?: number[];
  dueBefore?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface CreatePaymentRunInput {
  name: string;
  scheduledDate?: string;
  filters?: CreatePaymentRunFilters;
}

export interface UpdatePaymentRunItemInput {
  amount?: number;
  excluded?: boolean;
}

export interface AllocationItem {
  billId: number;
  amount: number;
}

export interface CreateVendorPaymentAllocationInput {
  vendorPaymentId: number;
  allocations: AllocationItem[];
}

function toQuery<P extends object>(params: P): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = String(v);
  }
  return out;
}

export function usePaymentRuns(params: ListPaymentRunsParams = {}) {
  const can = useCan("accounting:payment-runs:read");
  return useQuery<CursorPage<PaymentRunSummary>, Error>({
    queryKey: apRunKeys.paymentRuns(params),
    queryFn: ({ signal }) =>
      apiClient.get<CursorPage<PaymentRunSummary>>(
        "/accounting/payment-runs",
        toQuery(params), signal,
      ),
    staleTime: 30_000,
    enabled: can,
  });
}

export function usePaymentRun(runId: number) {
  const can = useCan("accounting:payment-runs:read");
  return useQuery<PaymentRunDetail, Error>({
    queryKey: apRunKeys.paymentRun(runId),
    queryFn: ({ signal }) => apiClient.get<PaymentRunDetail>(`/accounting/payment-runs/${runId}`, undefined, signal),
    staleTime: 30_000,
    enabled: can && Number.isInteger(runId) && runId > 0,
  });
}

export function useCreatePaymentRun() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<PaymentRunSummary, Error, CreatePaymentRunInput>("accounting:payment-runs:manage", {
    mutationKey: ["create-payment-run"],
    mutationFn: (body) =>
      apiClient.post<PaymentRunSummary>("/accounting/payment-runs", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: apRunKeys.paymentRuns(), exact: false });
    },
  });
}

export function useApprovePaymentRun(runId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<PaymentRunSummary, Error, void>("accounting:payment-runs:approve", {
    mutationKey: ["approve-payment-run", runId],
    mutationFn: () =>
      apiClient.post<PaymentRunSummary>(`/accounting/payment-runs/${runId}/approve`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: apRunKeys.paymentRun(runId) });
      void queryClient.invalidateQueries({ queryKey: apRunKeys.paymentRuns(), exact: false });
    },
  });
}

export function useExecutePaymentRun(runId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ id: number; status: string }, Error, void>("accounting:payment-runs:manage", {
    mutationKey: ["execute-payment-run", runId],
    mutationFn: () =>
      apiClient.post<{ id: number; status: string }>(
        `/accounting/payment-runs/${runId}/execute`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: apRunKeys.paymentRun(runId) });
      void queryClient.invalidateQueries({ queryKey: apRunKeys.paymentRuns(), exact: false });
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
    },
  });
}

export function useCancelPaymentRun(runId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ id: number; status: string }, Error, void>("accounting:payment-runs:manage", {
    mutationKey: ["cancel-payment-run", runId],
    mutationFn: () =>
      apiClient.post<{ id: number; status: string }>(
        `/accounting/payment-runs/${runId}/cancel`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: apRunKeys.paymentRun(runId) });
      void queryClient.invalidateQueries({ queryKey: apRunKeys.paymentRuns(), exact: false });
    },
  });
}

export function useUpdatePaymentRunItem(runId: number, itemId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ id: number; updated: boolean }, Error, UpdatePaymentRunItemInput>("accounting:payment-runs:manage", {
    mutationKey: ["update-payment-run-item", runId, itemId],
    mutationFn: (body) =>
      apiClient.patch<{ id: number; updated: boolean }>(
        `/accounting/payment-runs/${runId}/items/${itemId}`,
        body,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: apRunKeys.paymentRun(runId) });
    },
  });
}

export function useCreateVendorPaymentAllocation() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, CreateVendorPaymentAllocationInput>("accounting:payables:manage", {
    mutationKey: ["create-vendor-payment-allocation"],
    mutationFn: (body) =>
      apiClient.post<{ success: boolean }>("/accounting/vendor-payments/allocations", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
    },
  });
}
