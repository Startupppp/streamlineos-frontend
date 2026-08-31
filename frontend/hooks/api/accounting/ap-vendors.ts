"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { CursorPage } from "@/hooks/api/accounting";

const apVendorKeys = {
  vendorCredits: (params?: object) =>
    ["streamlineos", "accounting", "ap", "vendor-credits", params] as const,
  vendorCredit: (id: number) =>
    ["streamlineos", "accounting", "ap", "vendor-credits", id] as const,
  recurringBills: (params?: object) =>
    ["streamlineos", "accounting", "ap", "recurring-bills", params] as const,
  recurringBill: (id: number) =>
    ["streamlineos", "accounting", "ap", "recurring-bills", id] as const,
};

export type VendorCreditStatus = "DRAFT" | "POSTED" | "APPLIED" | "VOID";
export type RecurringFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

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
  cursor?: string;
  limit?: number;
  vendorId?: number;
  status?: VendorCreditStatus;
}

export interface ListRecurringBillsParams {
  cursor?: string;
  limit?: number;
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

function toQuery<P extends object>(params: P): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = String(v);
  }
  return out;
}

export function useVendorCredits(params: ListVendorCreditsParams = {}) {
  const can = useCan("accounting:vendor-credits:read");
  return useQuery<CursorPage<VendorCreditSummary>, Error>({
    queryKey: apVendorKeys.vendorCredits(params),
    queryFn: () =>
      apiClient.get<CursorPage<VendorCreditSummary>>(
        "/accounting/vendor-credits",
        toQuery(params),
      ),
    staleTime: 30_000,
    enabled: can,
  });
}

export function useVendorCredit(creditId: number) {
  const can = useCan("accounting:vendor-credits:read");
  return useQuery<VendorCreditDetail, Error>({
    queryKey: apVendorKeys.vendorCredit(creditId),
    queryFn: () =>
      apiClient.get<VendorCreditDetail>(`/accounting/vendor-credits/${creditId}`),
    staleTime: 60_000,
    enabled: can && Number.isInteger(creditId) && creditId > 0,
  });
}

export function useCreateVendorCredit() {
  const queryClient = useQueryClient();
  return useMutation<VendorCreditSummary, Error, CreateVendorCreditInput>({
    mutationKey: ["create-vendor-credit"],
    mutationFn: (body) =>
      apiClient.post<VendorCreditSummary>("/accounting/vendor-credits", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apVendorKeys.vendorCredits(), exact: false });
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
      queryClient.invalidateQueries({ queryKey: apVendorKeys.vendorCredit(creditId) });
      queryClient.invalidateQueries({ queryKey: apVendorKeys.vendorCredits(), exact: false });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.apAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
    },
  });
}

export function useRecurringBills(params: ListRecurringBillsParams = {}) {
  const can = useCan("accounting:recurring:read");
  return useQuery<CursorPage<RecurringBillTemplate>, Error>({
    queryKey: apVendorKeys.recurringBills(params),
    queryFn: () =>
      apiClient.get<CursorPage<RecurringBillTemplate>>(
        "/accounting/recurring-bills",
        toQuery(params),
      ),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useCreateRecurringBill() {
  const queryClient = useQueryClient();
  return useMutation<RecurringBillTemplate, Error, CreateRecurringBillInput>({
    mutationKey: ["create-recurring-bill"],
    mutationFn: (body) =>
      apiClient.post<RecurringBillTemplate>("/accounting/recurring-bills", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apVendorKeys.recurringBills(), exact: false });
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
      queryClient.invalidateQueries({ queryKey: apVendorKeys.recurringBills(), exact: false });
      queryClient.invalidateQueries({ queryKey: apVendorKeys.recurringBill(templateId) });
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
      queryClient.invalidateQueries({ queryKey: apVendorKeys.recurringBills(), exact: false });
      queryClient.invalidateQueries({ queryKey: apVendorKeys.recurringBill(templateId) });
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
      queryClient.invalidateQueries({ queryKey: apVendorKeys.recurringBills(), exact: false });
      queryClient.invalidateQueries({ queryKey: apVendorKeys.recurringBill(templateId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
    },
  });
}
