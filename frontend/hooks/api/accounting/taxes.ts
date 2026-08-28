"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  TaxCode,
  TaxDashboard,
  TaxReportLine,
  LiabilitySummaryResponse,
  TaxPayment,
  TaxPaymentInput,
  CreateTaxAdjustmentInput,
} from "@/types/accounting/taxes";

interface ListResponse<T> {
  items: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  pagination?: { limit: number; hasMore: boolean; nextCursor: number | null };
}

const taxKeys = {
  all: [...queryKeys.accounting.all, "taxes"] as const,
  codes: (params?: object) =>
    [...queryKeys.accounting.all, "taxes", "codes", params] as const,
  dashboard: (from: string, to: string) =>
    [...queryKeys.accounting.all, "taxes", "dashboard", from, to] as const,
  reportOutput: (params?: object) =>
    [...queryKeys.accounting.all, "taxes", "report-output", params] as const,
  reportInput: (params?: object) =>
    [...queryKeys.accounting.all, "taxes", "report-input", params] as const,
  liabilitySummary: (from: string, to: string) =>
    [...queryKeys.accounting.all, "taxes", "liability-summary", from, to] as const,
  payments: (params?: object) =>
    [...queryKeys.accounting.all, "taxes", "payments", params] as const,
};

function toQuery<P extends object>(params: P): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = String(v);
  }
  return out;
}

export interface ListTaxCodesParams {
  page?: number;
  pageSize?: number;
  taxType?: string;
  isActive?: boolean;
}

export function useListTaxCodes(params: ListTaxCodesParams = {}) {
  return useQuery<ListResponse<TaxCode>, Error>({
    queryKey: taxKeys.codes(params),
    queryFn: () =>
      apiClient.get<ListResponse<TaxCode>>("/accounting/tax-codes", toQuery(params)),
    staleTime: 60_000,
  });
}

export interface CreateTaxCodeInput {
  name: string;
  code: string;
  rate: string;
  taxType: TaxCode["taxType"];
  isReverseCharge?: boolean;
  collectedAccountId?: number;
  paidAccountId?: number;
  isActive?: boolean;
}

export function useCreateTaxCode() {
  const queryClient = useQueryClient();
  return useMutation<TaxCode, Error, CreateTaxCodeInput>({
    mutationKey: ["accounting", "tax-codes", "create"],
    mutationFn: (data) => apiClient.post<TaxCode>("/accounting/tax-codes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxKeys.all });
    },
  });
}

export type UpdateTaxCodeInput = Partial<CreateTaxCodeInput>;

export function useUpdateTaxCode(id: number) {
  const queryClient = useQueryClient();
  return useMutation<TaxCode, Error, UpdateTaxCodeInput>({
    mutationKey: ["accounting", "tax-codes", "update", id],
    mutationFn: (data) => apiClient.patch<TaxCode>(`/accounting/tax-codes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxKeys.all });
    },
  });
}

export function useSeedDefaultTaxCodes() {
  const queryClient = useQueryClient();
  return useMutation<{ seeded: number }, Error, void>({
    mutationKey: ["accounting", "tax-codes", "seed-defaults"],
    mutationFn: () =>
      apiClient.post<{ seeded: number }>("/accounting/tax-codes/seed-defaults"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxKeys.all });
    },
  });
}

export function useTaxDashboard(from: string, to: string) {
  return useQuery<TaxDashboard, Error>({
    queryKey: taxKeys.dashboard(from, to),
    queryFn: () =>
      apiClient.get<TaxDashboard>("/accounting/taxes/dashboard", { from, to }),
    enabled: !!from && !!to,
    staleTime: 120_000,
  });
}

export interface TaxReportParams {
  from?: string;
  to?: string;
  rate?: string;
  page?: number;
  pageSize?: number;
}

export function useTaxReportOutput(params: TaxReportParams = {}) {
  return useQuery<ListResponse<TaxReportLine>, Error>({
    queryKey: taxKeys.reportOutput(params),
    queryFn: () =>
      apiClient.get<ListResponse<TaxReportLine>>(
        "/accounting/taxes/reports/output",
        toQuery(params),
      ),
    enabled: !!params.from && !!params.to,
    staleTime: 30_000,
  });
}

export function useTaxReportInput(params: TaxReportParams = {}) {
  return useQuery<ListResponse<TaxReportLine>, Error>({
    queryKey: taxKeys.reportInput(params),
    queryFn: () =>
      apiClient.get<ListResponse<TaxReportLine>>(
        "/accounting/taxes/reports/input",
        toQuery(params),
      ),
    enabled: !!params.from && !!params.to,
    staleTime: 30_000,
  });
}

export function useTaxLiabilitySummary(from: string, to: string) {
  return useQuery<LiabilitySummaryResponse, Error>({
    queryKey: taxKeys.liabilitySummary(from, to),
    queryFn: () =>
      apiClient.get<LiabilitySummaryResponse>(
        "/accounting/taxes/reports/liability-summary",
        { from, to },
      ),
    enabled: !!from && !!to,
    staleTime: 30_000,
  });
}

export interface ListTaxPaymentsParams {
  page?: number;
  pageSize?: number;
  limit?: number;
  cursor?: number;
  taxType?: string;
  from?: string;
  to?: string;
}

export function useTaxPayments(params: ListTaxPaymentsParams = {}) {
  return useQuery<ListResponse<TaxPayment>, Error>({
    queryKey: taxKeys.payments(params),
    queryFn: () =>
      apiClient.get<ListResponse<TaxPayment>>(
        "/accounting/taxes/payments",
        toQuery(params),
      ),
    staleTime: 30_000,
  });
}

export function useCreateTaxPayment() {
  const queryClient = useQueryClient();
  return useMutation<TaxPayment, Error, TaxPaymentInput>({
    mutationKey: ["accounting", "taxes", "payments", "create"],
    mutationFn: (data) => apiClient.post<TaxPayment>("/accounting/taxes/payments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxKeys.all });
    },
  });
}

export function useDeleteTaxPayment() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationKey: ["accounting", "taxes", "payments", "delete"],
    mutationFn: (paymentId) =>
      apiClient.delete<void>(`/accounting/taxes/payments/${paymentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxKeys.all });
    },
  });
}

export function useCreateTaxAdjustment() {
  const queryClient = useQueryClient();
  return useMutation<{ journalEntryId: number; entryNumber: string }, Error, CreateTaxAdjustmentInput>({
    mutationKey: ["accounting", "taxes", "adjustments", "create"],
    mutationFn: (data) =>
      apiClient.post<{ journalEntryId: number; entryNumber: string }>(
        "/accounting/taxes/adjustments",
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxKeys.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
    },
  });
}
