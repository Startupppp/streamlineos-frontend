"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  ApAgingParams,
  ApAgingReport,
  ApAllocationInput,
  ApDocumentDetail,
  ApDocumentPage,
  ApLedgerTieOut,
  ApPayment,
  ApPaymentPage,
  ApPaymentPostResult,
  ApPostResult,
  ApTaxPreview,
  CreateApDocumentInput,
  ListApDocumentsParams,
  ListApPaymentsParams,
  ListVendorsParams,
  PostApPaymentInput,
  SaveVendorInput,
  UpdateApDocumentInput,
  VendorDetail,
  VendorPage,
} from "@/types/accounting-ap";

type QueryOpts<T> = Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">;

const ENTITY_STALE = 60 * 1000;
const STANDARD_LIST_STALE = 30 * 1000;
const SLOW_LIST_STALE = 2 * 60 * 1000;

const DOCUMENTS_PATH = "/accounting/payables/documents";
const PAYMENTS_PATH = "/accounting/payables/payments";
const PARTIES_PATH = "/accounting/parties";

function queryParams(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ""),
  );
}

export function useVendors(params: ListVendorsParams = {}, options?: QueryOpts<VendorPage>) {
  const canRead = useCan("accounting:read");
  const request = queryParams({
    role: params.role ?? "vendor",
    search: params.search,
    includeInactive: params.includeInactive,
    page: params.page,
    pageSize: params.pageSize,
  });
  return useQuery<VendorPage, Error>({
    queryKey: queryKeys.accountingAp.vendors(request),
    queryFn: () => apiClient.get<VendorPage>(PARTIES_PATH, request),
    staleTime: STANDARD_LIST_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useVendor(partyId: string, options?: QueryOpts<VendorDetail>) {
  const canRead = useCan("accounting:read");
  return useQuery<VendorDetail, Error>({
    queryKey: queryKeys.accountingAp.vendor(partyId),
    queryFn: () => apiClient.get<VendorDetail>(`${PARTIES_PATH}/${partyId}`),
    staleTime: ENTITY_STALE,
    ...options,
    enabled: canRead && !!partyId && (options?.enabled ?? true),
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation<VendorDetail, Error, SaveVendorInput>({
    mutationKey: ["accounting", "ap", "vendors", "create"],
    mutationFn: (input) => apiClient.post<VendorDetail>(PARTIES_PATH, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accountingAp.vendorsAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.accountingAr.all });
    },
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();
  return useMutation<VendorDetail, Error, { partyId: string; input: Partial<SaveVendorInput> }>({
    mutationKey: ["accounting", "ap", "vendors", "update"],
    mutationFn: ({ partyId, input }) =>
      apiClient.patch<VendorDetail>(`${PARTIES_PATH}/${partyId}`, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accountingAp.vendorsAll });
      queryClient.invalidateQueries({
        queryKey: queryKeys.accountingAp.vendor(variables.partyId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.accountingAr.all });
    },
  });
}

export function useApDocuments(
  params: ListApDocumentsParams = {},
  options?: QueryOpts<ApDocumentPage>,
) {
  const canRead = useCan("accounting:payables:read");
  const request = queryParams({ ...params });
  return useQuery<ApDocumentPage, Error>({
    queryKey: queryKeys.accountingAp.documents(request),
    queryFn: () => apiClient.get<ApDocumentPage>(DOCUMENTS_PATH, request),
    staleTime: STANDARD_LIST_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useApDocument(apDocumentId: string, options?: QueryOpts<ApDocumentDetail>) {
  const canRead = useCan("accounting:payables:read");
  return useQuery<ApDocumentDetail, Error>({
    queryKey: queryKeys.accountingAp.document(apDocumentId),
    queryFn: () => apiClient.get<ApDocumentDetail>(`${DOCUMENTS_PATH}/${apDocumentId}`),
    staleTime: ENTITY_STALE,
    ...options,
    enabled: canRead && !!apDocumentId && (options?.enabled ?? true),
  });
}

export function useApDocumentTaxPreview(
  apDocumentId: string,
  options?: QueryOpts<ApTaxPreview>,
) {
  const canRead = useCan("accounting:payables:read");
  return useQuery<ApTaxPreview, Error>({
    queryKey: queryKeys.accountingAp.documentTaxPreview(apDocumentId),
    queryFn: () => apiClient.get<ApTaxPreview>(`${DOCUMENTS_PATH}/${apDocumentId}/tax-preview`),
    staleTime: ENTITY_STALE,
    ...options,
    enabled: canRead && !!apDocumentId && (options?.enabled ?? true),
  });
}

function invalidateApDocuments(
  queryClient: ReturnType<typeof useQueryClient>,
  apDocumentId?: string,
): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.accountingAp.documentsAll });
  queryClient.invalidateQueries({ queryKey: queryKeys.accountingAp.agingAll });
  if (apDocumentId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.accountingAp.document(apDocumentId) });
    queryClient.invalidateQueries({
      queryKey: queryKeys.accountingAp.documentTaxPreview(apDocumentId),
    });
  }
}

export function useCreateApDocument() {
  const queryClient = useQueryClient();
  return useMutation<ApDocumentDetail, Error, CreateApDocumentInput>({
    mutationKey: ["accounting", "ap", "documents", "create"],
    mutationFn: (input) => apiClient.post<ApDocumentDetail>(DOCUMENTS_PATH, input),
    onSuccess: (data) => invalidateApDocuments(queryClient, data.id),
  });
}

export function useUpdateApDocument() {
  const queryClient = useQueryClient();
  return useMutation<
    ApDocumentDetail,
    Error,
    { apDocumentId: string; input: UpdateApDocumentInput }
  >({
    mutationKey: ["accounting", "ap", "documents", "update"],
    mutationFn: ({ apDocumentId, input }) =>
      apiClient.patch<ApDocumentDetail>(`${DOCUMENTS_PATH}/${apDocumentId}`, input),
    onSuccess: (_data, variables) => invalidateApDocuments(queryClient, variables.apDocumentId),
  });
}

export function useDeleteApDocument() {
  const queryClient = useQueryClient();
  return useMutation<{ id: string; deleted: true }, Error, string>({
    mutationKey: ["accounting", "ap", "documents", "delete"],
    mutationFn: (apDocumentId) =>
      apiClient.delete<{ id: string; deleted: true }>(`${DOCUMENTS_PATH}/${apDocumentId}`),
    onSuccess: (_data, apDocumentId) => invalidateApDocuments(queryClient, apDocumentId),
  });
}

export function usePostApDocument() {
  const queryClient = useQueryClient();
  return useMutation<ApPostResult, Error, string>({
    mutationKey: ["accounting", "ap", "documents", "post"],
    mutationFn: (apDocumentId) =>
      apiClient.post<ApPostResult>(`${DOCUMENTS_PATH}/${apDocumentId}/post`, {}),
    onSuccess: (_data, apDocumentId) => {
      invalidateApDocuments(queryClient, apDocumentId);
      queryClient.invalidateQueries({ queryKey: queryKeys.accountingLedger.all });
    },
  });
}

export function useApPayments(
  params: ListApPaymentsParams = {},
  options?: QueryOpts<ApPaymentPage>,
) {
  const canRead = useCan("accounting:payables:read");
  const request = queryParams({ ...params });
  return useQuery<ApPaymentPage, Error>({
    queryKey: queryKeys.accountingAp.payments(request),
    queryFn: () => apiClient.get<ApPaymentPage>(PAYMENTS_PATH, request),
    staleTime: STANDARD_LIST_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useApPayment(paymentId: string, options?: QueryOpts<ApPayment>) {
  const canRead = useCan("accounting:payables:read");
  return useQuery<ApPayment, Error>({
    queryKey: queryKeys.accountingAp.payment(paymentId),
    queryFn: () => apiClient.get<ApPayment>(`${PAYMENTS_PATH}/${paymentId}`),
    staleTime: ENTITY_STALE,
    ...options,
    enabled: canRead && !!paymentId && (options?.enabled ?? true),
  });
}

function invalidateApPayments(
  queryClient: ReturnType<typeof useQueryClient>,
  paymentId?: string,
): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.accountingAp.paymentsAll });
  queryClient.invalidateQueries({ queryKey: queryKeys.accountingAp.documentsAll });
  queryClient.invalidateQueries({ queryKey: queryKeys.accountingAp.agingAll });
  queryClient.invalidateQueries({ queryKey: queryKeys.accountingBanking.all });
  if (paymentId)
    queryClient.invalidateQueries({ queryKey: queryKeys.accountingAp.payment(paymentId) });
}

export function usePostApPayment() {
  const queryClient = useQueryClient();
  return useMutation<ApPaymentPostResult, Error, PostApPaymentInput>({
    mutationKey: ["accounting", "ap", "payments", "post"],
    mutationFn: (input) => apiClient.post<ApPaymentPostResult>(PAYMENTS_PATH, input),
    onSuccess: (data) => invalidateApPayments(queryClient, data.payment.id),
  });
}

export function useAllocateApPayment() {
  const queryClient = useQueryClient();
  return useMutation<
    ApPayment,
    Error,
    { paymentId: string; allocations: ApAllocationInput[] }
  >({
    mutationKey: ["accounting", "ap", "payments", "allocate"],
    mutationFn: ({ paymentId, allocations }) =>
      apiClient.post<ApPayment>(`${PAYMENTS_PATH}/${paymentId}/allocations`, { allocations }),
    onSuccess: (_data, variables) => invalidateApPayments(queryClient, variables.paymentId),
  });
}

export function useAllocateDebitNote() {
  const queryClient = useQueryClient();
  return useMutation<
    ApDocumentDetail,
    Error,
    { debitNoteId: string; allocations: ApAllocationInput[] }
  >({
    mutationKey: ["accounting", "ap", "debitNotes", "allocate"],
    mutationFn: ({ debitNoteId, allocations }) =>
      apiClient.post<ApDocumentDetail>(
        `/accounting/payables/debit-notes/${debitNoteId}/allocations`,
        { allocations },
      ),
    onSuccess: (_data, variables) => invalidateApDocuments(queryClient, variables.debitNoteId),
  });
}

export function useReverseApPayment() {
  const queryClient = useQueryClient();
  return useMutation<
    ApPaymentPostResult,
    Error,
    { paymentId: string; reversalDate?: string; reason?: string }
  >({
    mutationKey: ["accounting", "ap", "payments", "reverse"],
    mutationFn: ({ paymentId, ...body }) =>
      apiClient.post<ApPaymentPostResult>(`${PAYMENTS_PATH}/${paymentId}/reverse`, body),
    onSuccess: (_data, variables) => {
      invalidateApPayments(queryClient, variables.paymentId);
      queryClient.invalidateQueries({ queryKey: queryKeys.accountingLedger.all });
    },
  });
}

export function useApAging(params: ApAgingParams = {}, options?: QueryOpts<ApAgingReport>) {
  const canRead = useCan("accounting:reports:read");
  const request = queryParams({ ...params });
  return useQuery<ApAgingReport, Error>({
    queryKey: queryKeys.accountingAp.aging(request),
    queryFn: () => apiClient.get<ApAgingReport>("/accounting/payables/aging", request),
    staleTime: SLOW_LIST_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useApLedgerTieOut(asOf: string, options?: QueryOpts<ApLedgerTieOut>) {
  const canRead = useCan("accounting:reports:read");
  return useQuery<ApLedgerTieOut, Error>({
    queryKey: queryKeys.accountingAp.agingTieOut(asOf),
    queryFn: () =>
      apiClient.get<ApLedgerTieOut>("/accounting/reports/aging", {
        side: "ap",
        asOf,
        includeDocuments: "false",
      }),
    staleTime: SLOW_LIST_STALE,
    ...options,
    enabled: canRead && !!asOf && (options?.enabled ?? true),
  });
}
