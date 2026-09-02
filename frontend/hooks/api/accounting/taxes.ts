"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { CursorPage } from "@/hooks/api/accounting";
import type {
  TaxCode,
  TaxDashboard,
  TaxReportLine,
  LiabilitySummaryResponse,
  TaxPayment,
  TaxPaymentInput,
  CreateTaxAdjustmentInput,
} from "@/types/accounting/taxes";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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
  cursor?: string;
  limit?: number;
  taxType?: string;
  isActive?: boolean;
}

export function useListTaxCodes(params: ListTaxCodesParams = {}) {
  const can = useCan("accounting:taxes:read");
  return useQuery<CursorPage<TaxCode>, Error>({
    queryKey: taxKeys.codes(params),
    queryFn: ({ signal }) =>
      apiClient.get<CursorPage<TaxCode>>("/accounting/tax-codes", toQuery(params), signal),
    staleTime: 60_000,
    enabled: can,
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
  return useAuthorizedMutation<TaxCode, Error, CreateTaxCodeInput>("accounting:taxes:manage", {
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
  return useAuthorizedMutation<TaxCode, Error, UpdateTaxCodeInput>("accounting:taxes:manage", {
    mutationKey: ["accounting", "tax-codes", "update", id],
    mutationFn: (data) => apiClient.patch<TaxCode>(`/accounting/tax-codes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxKeys.all });
    },
  });
}

export function useSeedDefaultTaxCodes() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ seeded: number }, Error, void>("accounting:taxes:manage", {
    mutationKey: ["accounting", "tax-codes", "seed-defaults"],
    mutationFn: () =>
      apiClient.post<{ seeded: number }>("/accounting/tax-codes/seed-defaults"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxKeys.all });
    },
  });
}

export function useTaxDashboard(from: string, to: string) {
  const can = useCan("accounting:taxes:read");
  return useQuery<TaxDashboard, Error>({
    queryKey: taxKeys.dashboard(from, to),
    queryFn: ({ signal }) =>
      apiClient.get<TaxDashboard>("/accounting/taxes/dashboard", { from, to }, signal),
    enabled: can && !!from && !!to,
    staleTime: 120_000,
  });
}

export interface TaxReportParams {
  from?: string;
  to?: string;
  rate?: string;
  cursor?: string;
  limit?: number;
}

export function useTaxReportOutput(params: TaxReportParams = {}) {
  const can = useCan("accounting:taxes:read");
  return useQuery<CursorPage<TaxReportLine>, Error>({
    queryKey: taxKeys.reportOutput(params),
    queryFn: ({ signal }) =>
      apiClient.get<CursorPage<TaxReportLine>>(
        "/accounting/taxes/reports/output",
        toQuery(params), signal,
      ),
    enabled: can && !!params.from && !!params.to,
    staleTime: 30_000,
  });
}

export function useTaxReportInput(params: TaxReportParams = {}) {
  const can = useCan("accounting:taxes:read");
  return useQuery<CursorPage<TaxReportLine>, Error>({
    queryKey: taxKeys.reportInput(params),
    queryFn: ({ signal }) =>
      apiClient.get<CursorPage<TaxReportLine>>(
        "/accounting/taxes/reports/input",
        toQuery(params), signal,
      ),
    enabled: can && !!params.from && !!params.to,
    staleTime: 30_000,
  });
}

export function useTaxLiabilitySummary(from: string, to: string) {
  const can = useCan("accounting:taxes:read");
  return useQuery<LiabilitySummaryResponse, Error>({
    queryKey: taxKeys.liabilitySummary(from, to),
    queryFn: ({ signal }) =>
      apiClient.get<LiabilitySummaryResponse>(
        "/accounting/taxes/reports/liability-summary",
        { from, to }, signal,
      ),
    enabled: can && !!from && !!to,
    staleTime: 30_000,
  });
}

export interface ListTaxPaymentsParams {
  limit?: number;
  cursor?: number;
  taxType?: string;
  from?: string;
  to?: string;
}

export function useTaxPayments(params: ListTaxPaymentsParams = {}) {
  const can = useCan("accounting:taxes:read");
  return useQuery<ListResponse<TaxPayment>, Error>({
    queryKey: taxKeys.payments(params),
    queryFn: ({ signal }) =>
      apiClient.get<ListResponse<TaxPayment>>(
        "/accounting/taxes/payments",
        toQuery(params), signal,
      ),
    staleTime: 30_000,
    enabled: can,
  });
}

export function useCreateTaxPayment() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<TaxPayment, Error, TaxPaymentInput>("accounting:taxes:pay", {
    mutationKey: ["accounting", "taxes", "payments", "create"],
    mutationFn: (data) => apiClient.post<TaxPayment>("/accounting/taxes/payments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxKeys.all });
    },
  });
}

export function useDeleteTaxPayment() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<void, Error, number>("accounting:taxes:pay", {
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
  return useAuthorizedMutation<{ journalEntryId: number; entryNumber: string }, Error, CreateTaxAdjustmentInput>("accounting:taxes:manage", {
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
