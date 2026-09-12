"use client";

import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { accountingApQueryKeys } from "@/lib/query-keys/accounting-ap";
import { accountingArQueryKeys } from "@/lib/query-keys/accounting-ar";
import { accountingBankingQueryKeys } from "@/lib/query-keys/accounting-banking";
import { accountingLedgerQueryKeys } from "@/lib/query-keys/accounting-ledger";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import type { ApDocumentDetail, ApDocumentPage, ApTaxPreview, ListVendorsParams, SaveVendorInput, VendorDetail, VendorPage } from "@/types/accounting-ap";
import type { ApAgingParams, ApAgingReport, ApAllocationInput, ApLedgerTieOut, ApPayment, ApPaymentPage, ApPaymentPostResult, ApPostResult, CreateApDocumentInput, ListApDocumentsParams, ListApPaymentsParams, PostApPaymentInput, UpdateApDocumentInput } from "@/types/accounting-ap-payments";

type QueryOpts<T> = Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">;

const ENTITY_STALE = 60 * 1000;
const STANDARD_LIST_STALE = 30 * 1000;
const SLOW_LIST_STALE = 2 * 60 * 1000;

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
    queryKey: accountingApQueryKeys.accountingAp.vendors(request),
    queryFn: ({ signal }) => apiClient.get<VendorPage>("/accounting/parties", request, signal),
    staleTime: STANDARD_LIST_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useVendor(partyId: string, options?: QueryOpts<VendorDetail>) {
  const canRead = useCan("accounting:read");
  return useQuery<VendorDetail, Error>({
    queryKey: accountingApQueryKeys.accountingAp.vendor(partyId),
    queryFn: ({ signal }) =>
      apiClient.get<VendorDetail>(`/accounting/parties/${partyId}`, undefined, signal),
    staleTime: ENTITY_STALE,
    ...options,
    enabled: canRead && !!partyId && (options?.enabled ?? true),
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<VendorDetail, Error, SaveVendorInput>("accounting:create", {
    mutationKey: ["accounting", "ap", "vendors", "create"],
    mutationFn: (input) => apiClient.post<VendorDetail>("/accounting/parties", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingApQueryKeys.accountingAp.vendorsAll });
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.all });
    },
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    VendorDetail,
    Error,
    { partyId: string; input: Partial<SaveVendorInput> }
  >("accounting:update", {
    mutationKey: ["accounting", "ap", "vendors", "update"],
    mutationFn: ({ partyId, input }) =>
      apiClient.patch<VendorDetail>(`/accounting/parties/${partyId}`, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: accountingApQueryKeys.accountingAp.vendorsAll });
      queryClient.invalidateQueries({
        queryKey: accountingApQueryKeys.accountingAp.vendor(variables.partyId),
      });
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.all });
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
    queryKey: accountingApQueryKeys.accountingAp.documents(request),
    queryFn: ({ signal }) =>
      apiClient.get<ApDocumentPage>("/accounting/payables/documents", request, signal),
    staleTime: STANDARD_LIST_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useApDocument(apDocumentId: string, options?: QueryOpts<ApDocumentDetail>) {
  const canRead = useCan("accounting:payables:read");
  return useQuery<ApDocumentDetail, Error>({
    queryKey: accountingApQueryKeys.accountingAp.document(apDocumentId),
    queryFn: ({ signal }) =>
      apiClient.get<ApDocumentDetail>(
        `/accounting/payables/documents/${apDocumentId}`,
        undefined,
        signal,
      ),
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
    queryKey: accountingApQueryKeys.accountingAp.documentTaxPreview(apDocumentId),
    queryFn: ({ signal }) =>
      apiClient.get<ApTaxPreview>(
        `/accounting/payables/documents/${apDocumentId}/tax-preview`,
        undefined,
        signal,
      ),
    staleTime: ENTITY_STALE,
    ...options,
    enabled: canRead && !!apDocumentId && (options?.enabled ?? true),
  });
}

function invalidateApDocuments(
  queryClient: ReturnType<typeof useQueryClient>,
  apDocumentId?: string,
): void {
  queryClient.invalidateQueries({ queryKey: accountingApQueryKeys.accountingAp.documentsAll });
  queryClient.invalidateQueries({ queryKey: accountingApQueryKeys.accountingAp.agingAll });
  if (apDocumentId) {
    queryClient.invalidateQueries({ queryKey: accountingApQueryKeys.accountingAp.document(apDocumentId) });
    queryClient.invalidateQueries({
      queryKey: accountingApQueryKeys.accountingAp.documentTaxPreview(apDocumentId),
    });
  }
}

export function useCreateApDocument() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<ApDocumentDetail, Error, CreateApDocumentInput>(
    "accounting:payables:manage",
    {
      mutationKey: ["accounting", "ap", "documents", "create"],
      mutationFn: (input) =>
        apiClient.post<ApDocumentDetail>("/accounting/payables/documents", input),
      onSuccess: (data) => invalidateApDocuments(queryClient, data.id),
    },
  );
}

export function useUpdateApDocument() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    ApDocumentDetail,
    Error,
    { apDocumentId: string; input: UpdateApDocumentInput }
  >("accounting:payables:manage", {
    mutationKey: ["accounting", "ap", "documents", "update"],
    mutationFn: ({ apDocumentId, input }) =>
      apiClient.patch<ApDocumentDetail>(`/accounting/payables/documents/${apDocumentId}`, input),
    onSuccess: (_data, variables) => invalidateApDocuments(queryClient, variables.apDocumentId),
  });
}

export function useDeleteApDocument() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ id: string; deleted: true }, Error, string>(
    "accounting:payables:manage",
    {
      mutationKey: ["accounting", "ap", "documents", "delete"],
      mutationFn: (apDocumentId) =>
        apiClient.delete<{ id: string; deleted: true }>(
          `/accounting/payables/documents/${apDocumentId}`,
        ),
      onSuccess: (_data, apDocumentId) => invalidateApDocuments(queryClient, apDocumentId),
    },
  );
}

export function usePostApDocument() {
  const queryClient = useQueryClient();
  return useAuthorizedIdempotentMutation<ApPostResult, Error, string>(
    "accounting:payables:manage",
    {
      mutationKey: ["accounting", "ap", "documents", "post"],
      mutationFn: (apDocumentId, idempotencyKey) =>
        apiClient.post<ApPostResult>(
          `/accounting/payables/documents/${apDocumentId}/post`,
          {},
          { headers: { "Idempotency-Key": idempotencyKey } },
        ),
      onSuccess: (_data, apDocumentId) => {
        invalidateApDocuments(queryClient, apDocumentId);
        queryClient.invalidateQueries({ queryKey: accountingLedgerQueryKeys.accountingLedger.all });
      },
    },
  );
}

export function useApPayments(
  params: ListApPaymentsParams = {},
  options?: QueryOpts<ApPaymentPage>,
) {
  const canRead = useCan("accounting:payables:read");
  const request = queryParams({ ...params });
  return useQuery<ApPaymentPage, Error>({
    queryKey: accountingApQueryKeys.accountingAp.payments(request),
    queryFn: ({ signal }) =>
      apiClient.get<ApPaymentPage>("/accounting/payables/payments", request, signal),
    staleTime: STANDARD_LIST_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useApPayment(paymentId: string, options?: QueryOpts<ApPayment>) {
  const canRead = useCan("accounting:payables:read");
  return useQuery<ApPayment, Error>({
    queryKey: accountingApQueryKeys.accountingAp.payment(paymentId),
    queryFn: ({ signal }) =>
      apiClient.get<ApPayment>(`/accounting/payables/payments/${paymentId}`, undefined, signal),
    staleTime: ENTITY_STALE,
    ...options,
    enabled: canRead && !!paymentId && (options?.enabled ?? true),
  });
}

function invalidateApPayments(
  queryClient: ReturnType<typeof useQueryClient>,
  paymentId?: string,
): void {
  queryClient.invalidateQueries({ queryKey: accountingApQueryKeys.accountingAp.paymentsAll });
  queryClient.invalidateQueries({ queryKey: accountingApQueryKeys.accountingAp.documentsAll });
  queryClient.invalidateQueries({ queryKey: accountingApQueryKeys.accountingAp.agingAll });
  queryClient.invalidateQueries({ queryKey: accountingBankingQueryKeys.accountingBanking.all });
  if (paymentId)
    queryClient.invalidateQueries({ queryKey: accountingApQueryKeys.accountingAp.payment(paymentId) });
}

export function usePostApPayment() {
  const queryClient = useQueryClient();
  return useAuthorizedIdempotentMutation<ApPaymentPostResult, Error, PostApPaymentInput>(
    "accounting:payables:manage",
    {
      mutationKey: ["accounting", "ap", "payments", "post"],
      mutationFn: (input, idempotencyKey) =>
        apiClient.post<ApPaymentPostResult>("/accounting/payables/payments", input, {
          headers: { "Idempotency-Key": idempotencyKey },
        }),
      onSuccess: (data) => invalidateApPayments(queryClient, data.payment.id),
    },
  );
}

export function useAllocateApPayment() {
  const queryClient = useQueryClient();
  return useAuthorizedIdempotentMutation<
    ApPayment,
    Error,
    { paymentId: string; allocations: ApAllocationInput[] }
  >("accounting:payables:manage", {
    mutationKey: ["accounting", "ap", "payments", "allocate"],
    mutationFn: ({ paymentId, allocations }, idempotencyKey) =>
      apiClient.post<ApPayment>(
        `/accounting/payables/payments/${paymentId}/allocations`,
        { allocations },
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (_data, variables) => invalidateApPayments(queryClient, variables.paymentId),
  });
}

export function useAllocateDebitNote() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    ApDocumentDetail,
    Error,
    { debitNoteId: string; allocations: ApAllocationInput[] }
  >("accounting:vendor-credits:manage", {
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
  return useAuthorizedIdempotentMutation<
    ApPaymentPostResult,
    Error,
    { paymentId: string; reversalDate?: string; reason?: string }
  >("accounting:payables:approve", {
    mutationKey: ["accounting", "ap", "payments", "reverse"],
    mutationFn: ({ paymentId, ...body }, idempotencyKey) =>
      apiClient.post<ApPaymentPostResult>(
        `/accounting/payables/payments/${paymentId}/reverse`,
        body,
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (_data, variables) => {
      invalidateApPayments(queryClient, variables.paymentId);
      queryClient.invalidateQueries({ queryKey: accountingLedgerQueryKeys.accountingLedger.all });
    },
  });
}

export function useApAging(params: ApAgingParams = {}, options?: QueryOpts<ApAgingReport>) {
  const canRead = useCan("accounting:reports:read");
  const request = queryParams({ ...params });
  return useQuery<ApAgingReport, Error>({
    queryKey: accountingApQueryKeys.accountingAp.aging(request),
    queryFn: ({ signal }) =>
      apiClient.get<ApAgingReport>("/accounting/payables/aging", request, signal),
    staleTime: SLOW_LIST_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useApLedgerTieOut(asOf: string, options?: QueryOpts<ApLedgerTieOut>) {
  const canRead = useCan("accounting:reports:read");
  return useQuery<ApLedgerTieOut, Error>({
    queryKey: accountingApQueryKeys.accountingAp.agingTieOut(asOf),
    queryFn: ({ signal }) =>
      apiClient.get<ApLedgerTieOut>(
        "/accounting/reports/aging",
        { side: "ap", asOf, includeDocuments: "false" },
        signal,
      ),
    staleTime: SLOW_LIST_STALE,
    ...options,
    enabled: canRead && !!asOf && (options?.enabled ?? true),
  });
}
