"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

const apKeys = {
  all: ["streamlineos", "accounting", "ap"] as const,
  recurringBills: (params?: Record<string, unknown>) =>
    [...apKeys.all, "recurring-bills", params] as const,
  recurringBill: (id: number) => [...apKeys.all, "recurring-bills", id] as const,
  vendorCredits: (params?: Record<string, unknown>) =>
    [...apKeys.all, "vendor-credits", params] as const,
  vendorCredit: (id: number) => [...apKeys.all, "vendor-credits", id] as const,
  paymentRuns: (params?: Record<string, unknown>) =>
    [...apKeys.all, "payment-runs", params] as const,
  paymentRun: (id: number) => [...apKeys.all, "payment-runs", id] as const,
};

interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type VendorCreditStatus = "DRAFT" | "POSTED" | "APPLIED" | "VOID";
export type RecurringFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
export type PaymentRunStatus = "DRAFT" | "APPROVED" | "COMPLETED" | "CANCELLED";
export type PaymentRunItemStatus = "PENDING" | "PAID" | "SKIPPED";

export interface VendorCreditSummary {
  id: number;
  vendorCreditNumber: string;
  vendorId: number | null;
  vendorName: string | null;
  billId: number | null;
  status: VendorCreditStatus;
  reason: string | null;
  subtotal: string;
  taxAmount: string;
  total: string;
  appliedAmount: string;
  currency: string;
  createdAt: string;
}

export interface VendorCreditItem {
  id: number;
  vendorCreditId: number;
  description: string;
  hsnSacCode: string | null;
  quantity: string;
  rate: string;
  gstRate: string;
  amount: string;
  lineOrder: number;
}

export interface VendorCreditDetail extends VendorCreditSummary {
  notes: string | null;
  updatedAt: string;
  items: VendorCreditItem[];
}

export interface RecurringBillPayloadItem {
  description: string;
  hsnSacCode?: string;
  quantity: number;
  rate: number;
  gstRate: number;
}

export interface RecurringBillPayload {
  vendorId: number;
  vendorBillNumber?: string;
  billDate: string;
  dueDate?: string;
  placeOfSupply?: string;
  vendorGstin?: string;
  supplierGstin?: string;
  reverseCharge: boolean;
  discount: number;
  notes?: string;
  expenseAccountCode: string;
  items: RecurringBillPayloadItem[];
}

export interface RecurringBillTemplate {
  id: number;
  orgId: string;
  name: string;
  vendorId: number | null;
  frequency: RecurringFrequency;
  nextRunDate: string | null;
  lastRunDate: string | null;
  endDate: string | null;
  isActive: boolean;
  payload: RecurringBillPayload;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

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

export interface CreateVendorCreditItemInput {
  description: string;
  hsnSacCode?: string;
  quantity: number;
  rate: number;
  gstRate: number;
}

export interface CreateVendorCreditInput {
  vendorId: number;
  billId?: number;
  reason?: string;
  notes?: string;
  currency?: string;
  items: CreateVendorCreditItemInput[];
}

export interface ApplyVendorCreditInput {
  billId: number;
  amount: number;
}

export interface ListVendorCreditsParams {
  page?: number;
  pageSize?: number;
  vendorId?: number;
  status?: VendorCreditStatus;
}

export interface ListRecurringBillsParams {
  page?: number;
  pageSize?: number;
  isActive?: boolean;
}

export interface CreateRecurringBillInput {
  name: string;
  vendorId?: number;
  frequency: RecurringFrequency;
  nextRunDate?: string;
  endDate?: string;
  isActive?: boolean;
  payload: RecurringBillPayload;
}

export type UpdateRecurringBillInput = Partial<CreateRecurringBillInput>;

export interface ListPaymentRunsParams {
  page?: number;
  pageSize?: number;
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

export function useVendorCredits(params: ListVendorCreditsParams = {}) {
  return useQuery<ListResponse<VendorCreditSummary>, Error>({
    queryKey: apKeys.vendorCredits(params),
    queryFn: () =>
      apiClient.get<ListResponse<VendorCreditSummary>>(
        "/accounting/vendor-credits",
        toQuery(params),
      ),
    staleTime: 30_000,
  });
}

export function useVendorCredit(creditId: number) {
  return useQuery<VendorCreditDetail, Error>({
    queryKey: apKeys.vendorCredit(creditId),
    queryFn: () =>
      apiClient.get<VendorCreditDetail>(`/accounting/vendor-credits/${creditId}`),
    enabled: Number.isInteger(creditId) && creditId > 0,
    staleTime: 60_000,
  });
}

export function useCreateVendorCredit() {
  const queryClient = useQueryClient();
  return useMutation<VendorCreditSummary, Error, CreateVendorCreditInput>({
    mutationKey: ["create-vendor-credit"],
    mutationFn: (body) =>
      apiClient.post<VendorCreditSummary>("/accounting/vendor-credits", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apKeys.vendorCredits(), exact: false });
    },
  });
}

export function usePostVendorCredit(creditId: number) {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; status: string }, Error, void>({
    mutationKey: ["post-vendor-credit", creditId],
    mutationFn: () =>
      apiClient.post<{ id: number; status: string }>(
        `/accounting/vendor-credits/${creditId}/post`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apKeys.vendorCredit(creditId) });
      queryClient.invalidateQueries({ queryKey: apKeys.vendorCredits(), exact: false });
    },
  });
}

export function useApplyVendorCredit(creditId: number) {
  const queryClient = useQueryClient();
  return useMutation<
    { id: number; billId: number; appliedAmount: number },
    Error,
    ApplyVendorCreditInput
  >({
    mutationKey: ["apply-vendor-credit", creditId],
    mutationFn: (body) =>
      apiClient.post<{ id: number; billId: number; appliedAmount: number }>(
        `/accounting/vendor-credits/${creditId}/apply`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apKeys.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
    },
  });
}

export function useRecurringBills(params: ListRecurringBillsParams = {}) {
  return useQuery<ListResponse<RecurringBillTemplate>, Error>({
    queryKey: apKeys.recurringBills(params),
    queryFn: () =>
      apiClient.get<ListResponse<RecurringBillTemplate>>(
        "/accounting/recurring-bills",
        toQuery(params),
      ),
    staleTime: 60_000,
  });
}

export function useCreateRecurringBill() {
  const queryClient = useQueryClient();
  return useMutation<RecurringBillTemplate, Error, CreateRecurringBillInput>({
    mutationKey: ["create-recurring-bill"],
    mutationFn: (body) =>
      apiClient.post<RecurringBillTemplate>("/accounting/recurring-bills", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apKeys.recurringBills(), exact: false });
    },
  });
}

export function useUpdateRecurringBill(templateId: number) {
  const queryClient = useQueryClient();
  return useMutation<RecurringBillTemplate, Error, UpdateRecurringBillInput>({
    mutationKey: ["update-recurring-bill", templateId],
    mutationFn: (body) =>
      apiClient.patch<RecurringBillTemplate>(
        `/accounting/recurring-bills/${templateId}`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apKeys.recurringBills(), exact: false });
      queryClient.invalidateQueries({ queryKey: apKeys.recurringBill(templateId) });
    },
  });
}

export function useDeleteRecurringBill(templateId: number) {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; deleted: boolean }, Error, void>({
    mutationKey: ["delete-recurring-bill", templateId],
    mutationFn: () =>
      apiClient.delete<{ id: number; deleted: boolean }>(
        `/accounting/recurring-bills/${templateId}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apKeys.recurringBills(), exact: false });
      queryClient.invalidateQueries({ queryKey: apKeys.recurringBill(templateId) });
    },
  });
}

export function useRunRecurringBillNow(templateId: number) {
  const queryClient = useQueryClient();
  return useMutation<{ billId: number }, Error, void>({
    mutationKey: ["run-recurring-bill-now", templateId],
    mutationFn: () =>
      apiClient.post<{ billId: number }>(
        `/accounting/recurring-bills/${templateId}/run-now`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apKeys.recurringBills(), exact: false });
      queryClient.invalidateQueries({ queryKey: apKeys.recurringBill(templateId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
    },
  });
}

export function usePaymentRuns(params: ListPaymentRunsParams = {}) {
  return useQuery<ListResponse<PaymentRunSummary>, Error>({
    queryKey: apKeys.paymentRuns(params),
    queryFn: () =>
      apiClient.get<ListResponse<PaymentRunSummary>>(
        "/accounting/payment-runs",
        toQuery(params),
      ),
    staleTime: 30_000,
  });
}

export function usePaymentRun(runId: number) {
  return useQuery<PaymentRunDetail, Error>({
    queryKey: apKeys.paymentRun(runId),
    queryFn: () => apiClient.get<PaymentRunDetail>(`/accounting/payment-runs/${runId}`),
    enabled: Number.isInteger(runId) && runId > 0,
    staleTime: 30_000,
  });
}

export function useCreatePaymentRun() {
  const queryClient = useQueryClient();
  return useMutation<PaymentRunSummary, Error, CreatePaymentRunInput>({
    mutationKey: ["create-payment-run"],
    mutationFn: (body) =>
      apiClient.post<PaymentRunSummary>("/accounting/payment-runs", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apKeys.paymentRuns(), exact: false });
    },
  });
}

export function useApprovePaymentRun(runId: number) {
  const queryClient = useQueryClient();
  return useMutation<PaymentRunSummary, Error, void>({
    mutationKey: ["approve-payment-run", runId],
    mutationFn: () =>
      apiClient.post<PaymentRunSummary>(`/accounting/payment-runs/${runId}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apKeys.paymentRun(runId) });
      queryClient.invalidateQueries({ queryKey: apKeys.paymentRuns(), exact: false });
    },
  });
}

export function useExecutePaymentRun(runId: number) {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; status: string }, Error, void>({
    mutationKey: ["execute-payment-run", runId],
    mutationFn: () =>
      apiClient.post<{ id: number; status: string }>(
        `/accounting/payment-runs/${runId}/execute`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apKeys.paymentRun(runId) });
      queryClient.invalidateQueries({ queryKey: apKeys.paymentRuns(), exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
    },
  });
}

export function useCancelPaymentRun(runId: number) {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; status: string }, Error, void>({
    mutationKey: ["cancel-payment-run", runId],
    mutationFn: () =>
      apiClient.post<{ id: number; status: string }>(
        `/accounting/payment-runs/${runId}/cancel`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apKeys.paymentRun(runId) });
      queryClient.invalidateQueries({ queryKey: apKeys.paymentRuns(), exact: false });
    },
  });
}

export function useUpdatePaymentRunItem(runId: number, itemId: number) {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; updated: boolean }, Error, UpdatePaymentRunItemInput>({
    mutationKey: ["update-payment-run-item", runId, itemId],
    mutationFn: (body) =>
      apiClient.patch<{ id: number; updated: boolean }>(
        `/accounting/payment-runs/${runId}/items/${itemId}`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apKeys.paymentRun(runId) });
    },
  });
}

export function useCreateVendorPaymentAllocation() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, CreateVendorPaymentAllocationInput>({
    mutationKey: ["create-vendor-payment-allocation"],
    mutationFn: (body) =>
      apiClient.post<{ success: boolean }>("/accounting/vendor-payments/allocations", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
    },
  });
}
