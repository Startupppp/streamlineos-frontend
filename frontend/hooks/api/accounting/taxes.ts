"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { useCan } from "@/hooks/api/access";
import type { CursorPage } from "@/hooks/api/accounting";
import type {
  TaxCode,
  TaxType,
  TaxDashboard,
  TaxReportLine,
  LiabilitySummaryResponse,
  TaxPayment,
  TaxPaymentInput,
  CreateTaxAdjustmentInput,
} from "@/types/accounting/taxes";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import {
  taxCodeListContract,
  taxCodeCreatedContract,
  taxCodeUpdatedContract,
  taxCodeSeedContract,
  taxDashboardContract,
  taxOutputReportContract,
  taxInputReportContract,
  taxLiabilitySummaryContract,
  taxPaymentListContract,
  taxPaymentCreatedContract,
  taxPaymentDeleteContract,
  taxAdjustmentCreatedContract,
} from "@/hooks/api/accounting/taxes-schema";

interface ListResponse<T> {
  items: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  pagination?: { limit: number; hasMore: boolean; nextCursor: number | null };
}

const taxKeys = {
  all: [...accountingAndSupportQueryKeys.accounting.all, "taxes"] as const,
  codes: (params?: object) =>
    [...accountingAndSupportQueryKeys.accounting.all, "taxes", "codes", params] as const,
  dashboard: (from: string, to: string) =>
    [...accountingAndSupportQueryKeys.accounting.all, "taxes", "dashboard", from, to] as const,
  reportOutput: (params?: object) =>
    [...accountingAndSupportQueryKeys.accounting.all, "taxes", "report-output", params] as const,
  reportInput: (params?: object) =>
    [...accountingAndSupportQueryKeys.accounting.all, "taxes", "report-input", params] as const,
  liabilitySummary: (from: string, to: string) =>
    [...accountingAndSupportQueryKeys.accounting.all, "taxes", "liability-summary", from, to] as const,
  payments: (params?: object) =>
    [...accountingAndSupportQueryKeys.accounting.all, "taxes", "payments", params] as const,
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
      apiClient.get("/accounting/tax-codes", toQuery(params), signal, taxCodeListContract),
    staleTime: 60_000,
    enabled: can,
  });
}

export interface CreateTaxCodeInput {
  name: string;
  code: string;
  rate: string;
  taxType: TaxType;
  isReverseCharge?: boolean;
  collectedAccountId?: number;
  paidAccountId?: number;
  isActive?: boolean;
}

export function useCreateTaxCode() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<TaxCode, Error, CreateTaxCodeInput>("accounting:taxes:manage", {
    mutationKey: ["accounting", "tax-codes", "create"],
    mutationFn: (data) => apiClient.post("/accounting/tax-codes", data, undefined, taxCodeCreatedContract),
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
    mutationFn: (data) => apiClient.patch(`/accounting/tax-codes/${id}`, data, undefined, taxCodeUpdatedContract),
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
      apiClient.post("/accounting/tax-codes/seed-defaults", undefined, undefined, taxCodeSeedContract),
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
      apiClient.get("/accounting/taxes/dashboard", { from, to }, signal, taxDashboardContract),
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
      apiClient.get(
        "/accounting/taxes/reports/output",
        toQuery(params), signal, taxOutputReportContract,
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
      apiClient.get(
        "/accounting/taxes/reports/input",
        toQuery(params), signal, taxInputReportContract,
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
      apiClient.get(
        "/accounting/taxes/reports/liability-summary",
        { from, to }, signal, taxLiabilitySummaryContract,
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
      apiClient.get(
        "/accounting/taxes/payments",
        toQuery(params), signal, taxPaymentListContract,
      ),
    staleTime: 30_000,
    enabled: can,
  });
}

export function useCreateTaxPayment() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<TaxPayment, Error, TaxPaymentInput>("accounting:taxes:pay", {
    mutationKey: ["accounting", "taxes", "payments", "create"],
    mutationFn: (data) => apiClient.post("/accounting/taxes/payments", data, undefined, taxPaymentCreatedContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxKeys.all });
    },
  });
}

export function useDeleteTaxPayment() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ archived: boolean }, Error, number>("accounting:taxes:pay", {
    mutationKey: ["accounting", "taxes", "payments", "delete"],
    mutationFn: (paymentId) =>
      apiClient.delete(`/accounting/taxes/payments/${paymentId}`, undefined, undefined, taxPaymentDeleteContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxKeys.all });
    },
  });
}

export function useCreateTaxAdjustment() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ entryId: number; entryNumber: string }, Error, CreateTaxAdjustmentInput>("accounting:taxes:manage", {
    mutationKey: ["accounting", "taxes", "adjustments", "create"],
    mutationFn: (data) =>
      apiClient.post(
        "/accounting/taxes/adjustments",
        data, undefined, taxAdjustmentCreatedContract,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxKeys.all });
      queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.all });
    },
  });
}
