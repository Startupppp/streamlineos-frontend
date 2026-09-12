"use client";

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { accountingArQueryKeys } from "@/lib/query-keys/accounting-ar";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import type { Journal } from "@/types/accounting-kernel";
import type {
  ArDocumentPage,
  ArDocumentView,
  CreateCreditNoteInput,
  CreateInvoiceInput,
  CreditNoteFromInvoiceInput,
  DeletedResult,
  ListArDocumentsQuery,
  UpdateArDraftInput,
} from "@/types/accounting-ar";
import type {
  AgingOpenItem,
  AgingQuery,
  AgingReport,
  AllocationLineInput,
  ArReceiptPage,
  ArReceiptView,
  CreateReceiptInput,
  CreditNoteAllocationResult,
  FrozenTaxLine,
  ListReceiptsQuery,
  ReverseReceiptInput,
  TaxPreview,
} from "@/types/accounting-ar-receipts";

type QueryOpts<T> = Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">;

const LIVE_STALE = 0;
const STANDARD_LIST_STALE = 30 * 1000;
const ENTITY_STALE = 60 * 1000;

export const RECEIVABLES_READ = "accounting:receivables:read";
export const RECEIVABLES_MANAGE = "accounting:receivables:manage";
export const RECEIVABLES_APPROVE = "accounting:receivables:approve";
export const CREDIT_NOTES_READ = "accounting:credit-notes:read";
export const CREDIT_NOTES_CREATE = "accounting:credit-notes:create";
export const CREDIT_NOTES_MANAGE = "accounting:credit-notes:manage";
export const TAXES_READ = "accounting:taxes:read";

function documentParams(query: ListArDocumentsQuery): Record<string, unknown> {
  return {
    partyId: query.partyId,
    status: query.status,
    openOnly: query.openOnly ? "true" : undefined,
    from: query.from,
    to: query.to,
    search: query.search ? query.search : undefined,
    page: query.page,
    pageSize: query.pageSize,
  };
}

function receiptParams(query: ListReceiptsQuery): Record<string, unknown> {
  return {
    partyId: query.partyId,
    status: query.status,
    unappliedOnly: query.unappliedOnly ? "true" : undefined,
    from: query.from,
    to: query.to,
    page: query.page,
    pageSize: query.pageSize,
  };
}

function agingParams(query: AgingQuery): Record<string, unknown> {
  return {
    asOf: query.asOf,
    basis: query.basis,
    partyId: query.partyId,
    currency: query.currency,
    includeSettled: query.includeSettled ? "true" : undefined,
  };
}

export function useArInvoices(
  query: ListArDocumentsQuery = {},
  options?: QueryOpts<ArDocumentPage>,
) {
  const canRead = useCan(RECEIVABLES_READ);
  return useQuery<ArDocumentPage, Error>({
    queryKey: accountingArQueryKeys.accountingAr.invoices(documentParams(query)),
    queryFn: ({ signal }) =>
      apiClient.get<ArDocumentPage>("/accounting/ar/invoices", documentParams(query), signal),
    staleTime: STANDARD_LIST_STALE,
    placeholderData: keepPreviousData,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useArInvoice(invoiceId: string, options?: QueryOpts<ArDocumentView>) {
  const canRead = useCan(RECEIVABLES_READ);
  return useQuery<ArDocumentView, Error>({
    queryKey: accountingArQueryKeys.accountingAr.invoice(invoiceId),
    queryFn: ({ signal }) =>
      apiClient.get<ArDocumentView>(`/accounting/ar/invoices/${invoiceId}`, undefined, signal),
    staleTime: ENTITY_STALE,
    ...options,
    enabled: canRead && !!invoiceId && (options?.enabled ?? true),
  });
}

export function useArInvoiceTaxPreview(
  invoiceId: string,
  revision: string,
  options?: QueryOpts<TaxPreview>,
) {
  const canRead = useCan(RECEIVABLES_READ);
  return useQuery<TaxPreview, Error>({
    queryKey: accountingArQueryKeys.accountingAr.invoiceTaxPreview(invoiceId, revision),
    queryFn: ({ signal }) =>
      apiClient.get<TaxPreview>(`/accounting/ar/invoices/${invoiceId}/tax-preview`, undefined, signal),
    staleTime: LIVE_STALE,
    placeholderData: keepPreviousData,
    retry: false,
    ...options,
    enabled: canRead && !!invoiceId && (options?.enabled ?? true),
  });
}

export function useArInvoiceTaxLines(invoiceId: string, options?: QueryOpts<FrozenTaxLine[]>) {
  const canRead = useCan(TAXES_READ);
  return useQuery<FrozenTaxLine[], Error>({
    queryKey: accountingArQueryKeys.accountingAr.invoiceTaxLines(invoiceId),
    queryFn: ({ signal }) =>
      apiClient.get<FrozenTaxLine[]>(`/accounting/ar/invoices/${invoiceId}/tax-lines`, undefined, signal),
    staleTime: ENTITY_STALE,
    ...options,
    enabled: canRead && !!invoiceId && (options?.enabled ?? true),
  });
}

export function useCreateArInvoice() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<ArDocumentView, Error, CreateInvoiceInput>("accounting:receivables:manage", {
    mutationKey: ["accounting", "ar", "invoices", "create"],
    mutationFn: (input) => apiClient.post<ArDocumentView>("/accounting/ar/invoices", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.all });
    },
  });
}

export function useUpdateArInvoiceDraft() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    ArDocumentView,
    Error,
    { invoiceId: string; input: UpdateArDraftInput }
  >("accounting:receivables:manage", {
    mutationKey: ["accounting", "ar", "invoices", "update"],
    mutationFn: ({ invoiceId, input }) =>
      apiClient.patch<ArDocumentView>(`/accounting/ar/invoices/${invoiceId}`, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.invoice(variables.invoiceId) });
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.invoices() });
    },
  });
}

export function useDeleteArInvoiceDraft() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<DeletedResult, Error, string>("accounting:receivables:manage", {
    mutationKey: ["accounting", "ar", "invoices", "delete"],
    mutationFn: (invoiceId) => apiClient.delete<DeletedResult>(`/accounting/ar/invoices/${invoiceId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.all });
    },
  });
}

export function usePostArInvoice() {
  const queryClient = useQueryClient();
  return useAuthorizedIdempotentMutation<
    { document: ArDocumentView; journal: Journal },
    Error,
    string
  >("accounting:receivables:manage", {
    mutationKey: ["accounting", "ar", "invoices", "post"],
    mutationFn: (invoiceId, idempotencyKey) =>
      apiClient.post<{ document: ArDocumentView; journal: Journal }>(
        `/accounting/ar/invoices/${invoiceId}/post`,
        {},
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.all });
    },
  });
}

export function useCreditNoteFromInvoice() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    ArDocumentView,
    Error,
    { invoiceId: string; input: CreditNoteFromInvoiceInput }
  >("accounting:credit-notes:create", {
    mutationKey: ["accounting", "ar", "invoices", "creditNote"],
    mutationFn: ({ invoiceId, input }) =>
      apiClient.post<ArDocumentView>(`/accounting/ar/invoices/${invoiceId}/credit-note`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.all });
    },
  });
}

export function useCreditNotes(
  query: ListArDocumentsQuery = {},
  options?: QueryOpts<ArDocumentPage>,
) {
  const canRead = useCan(CREDIT_NOTES_READ);
  return useQuery<ArDocumentPage, Error>({
    queryKey: accountingArQueryKeys.accountingAr.creditNotes(documentParams(query)),
    queryFn: ({ signal }) =>
      apiClient.get<ArDocumentPage>("/accounting/ar/credit-notes", documentParams(query), signal),
    staleTime: STANDARD_LIST_STALE,
    placeholderData: keepPreviousData,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useCreditNote(creditNoteId: string, options?: QueryOpts<ArDocumentView>) {
  const canRead = useCan(CREDIT_NOTES_READ);
  return useQuery<ArDocumentView, Error>({
    queryKey: accountingArQueryKeys.accountingAr.creditNote(creditNoteId),
    queryFn: ({ signal }) =>
      apiClient.get<ArDocumentView>(`/accounting/ar/credit-notes/${creditNoteId}`, undefined, signal),
    staleTime: ENTITY_STALE,
    ...options,
    enabled: canRead && !!creditNoteId && (options?.enabled ?? true),
  });
}

export function useCreditNoteTaxPreview(
  creditNoteId: string,
  revision: string,
  options?: QueryOpts<TaxPreview>,
) {
  const canRead = useCan(CREDIT_NOTES_READ);
  return useQuery<TaxPreview, Error>({
    queryKey: accountingArQueryKeys.accountingAr.creditNoteTaxPreview(creditNoteId, revision),
    queryFn: ({ signal }) =>
      apiClient.get<TaxPreview>(
        `/accounting/ar/credit-notes/${creditNoteId}/tax-preview`,
        undefined,
        signal,
      ),
    staleTime: LIVE_STALE,
    placeholderData: keepPreviousData,
    retry: false,
    ...options,
    enabled: canRead && !!creditNoteId && (options?.enabled ?? true),
  });
}

export function useCreateCreditNote() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<ArDocumentView, Error, CreateCreditNoteInput>("accounting:credit-notes:create", {
    mutationKey: ["accounting", "ar", "creditNotes", "create"],
    mutationFn: (input) => apiClient.post<ArDocumentView>("/accounting/ar/credit-notes", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.all });
    },
  });
}

export function useUpdateCreditNoteDraft() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    ArDocumentView,
    Error,
    { creditNoteId: string; input: UpdateArDraftInput }
  >("accounting:credit-notes:manage", {
    mutationKey: ["accounting", "ar", "creditNotes", "update"],
    mutationFn: ({ creditNoteId, input }) =>
      apiClient.patch<ArDocumentView>(`/accounting/ar/credit-notes/${creditNoteId}`, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: accountingArQueryKeys.accountingAr.creditNote(variables.creditNoteId),
      });
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.creditNotes() });
    },
  });
}

export function useDeleteCreditNoteDraft() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<DeletedResult, Error, string>("accounting:credit-notes:manage", {
    mutationKey: ["accounting", "ar", "creditNotes", "delete"],
    mutationFn: (creditNoteId) =>
      apiClient.delete<DeletedResult>(`/accounting/ar/credit-notes/${creditNoteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.all });
    },
  });
}

export function usePostCreditNote() {
  const queryClient = useQueryClient();
  return useAuthorizedIdempotentMutation<
    { document: ArDocumentView; journal: Journal },
    Error,
    string
  >("accounting:credit-notes:manage", {
    mutationKey: ["accounting", "ar", "creditNotes", "post"],
    mutationFn: (creditNoteId, idempotencyKey) =>
      apiClient.post<{ document: ArDocumentView; journal: Journal }>(
        `/accounting/ar/credit-notes/${creditNoteId}/post`,
        {},
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.all });
    },
  });
}

export function useAllocateCreditNote() {
  const queryClient = useQueryClient();
  return useAuthorizedIdempotentMutation<
    CreditNoteAllocationResult,
    Error,
    { creditNoteId: string; allocations: AllocationLineInput[] }
  >("accounting:credit-notes:manage", {
    mutationKey: ["accounting", "ar", "creditNotes", "allocate"],
    mutationFn: ({ creditNoteId, allocations }, idempotencyKey) =>
      apiClient.post<CreditNoteAllocationResult>(
        `/accounting/ar/credit-notes/${creditNoteId}/allocations`,
        { allocations },
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.all });
    },
  });
}

export function useArReceipts(query: ListReceiptsQuery = {}, options?: QueryOpts<ArReceiptPage>) {
  const canRead = useCan(RECEIVABLES_READ);
  return useQuery<ArReceiptPage, Error>({
    queryKey: accountingArQueryKeys.accountingAr.receipts(receiptParams(query)),
    queryFn: ({ signal }) =>
      apiClient.get<ArReceiptPage>("/accounting/ar/receipts", receiptParams(query), signal),
    staleTime: STANDARD_LIST_STALE,
    placeholderData: keepPreviousData,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useArReceipt(receiptId: string, options?: QueryOpts<ArReceiptView>) {
  const canRead = useCan(RECEIVABLES_READ);
  return useQuery<ArReceiptView, Error>({
    queryKey: accountingArQueryKeys.accountingAr.receipt(receiptId),
    queryFn: ({ signal }) =>
      apiClient.get<ArReceiptView>(`/accounting/ar/receipts/${receiptId}`, undefined, signal),
    staleTime: ENTITY_STALE,
    ...options,
    enabled: canRead && !!receiptId && (options?.enabled ?? true),
  });
}

export function useCreateArReceipt() {
  const queryClient = useQueryClient();
  return useAuthorizedIdempotentMutation<
    { receipt: ArReceiptView; journal: Journal },
    Error,
    CreateReceiptInput
  >("accounting:receivables:manage", {
    mutationKey: ["accounting", "ar", "receipts", "create"],
    mutationFn: (input, idempotencyKey) =>
      apiClient.post<{ receipt: ArReceiptView; journal: Journal }>("/accounting/ar/receipts", input, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.all });
    },
  });
}

export function useAllocateArReceipt() {
  const queryClient = useQueryClient();
  return useAuthorizedIdempotentMutation<
    ArReceiptView,
    Error,
    { receiptId: string; allocations: AllocationLineInput[] }
  >("accounting:receivables:manage", {
    mutationKey: ["accounting", "ar", "receipts", "allocate"],
    mutationFn: ({ receiptId, allocations }, idempotencyKey) =>
      apiClient.post<ArReceiptView>(
        `/accounting/ar/receipts/${receiptId}/allocations`,
        { allocations },
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.all });
    },
  });
}

export function useAllocateArReceiptFifo() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<ArReceiptView, Error, { receiptId: string; maxAmountMinor?: number }>(
    "accounting:receivables:manage",
    {
      mutationKey: ["accounting", "ar", "receipts", "allocateFifo"],
      mutationFn: ({ receiptId, maxAmountMinor }) =>
        apiClient.post<ArReceiptView>(
          `/accounting/ar/receipts/${receiptId}/allocations/fifo`,
          maxAmountMinor === undefined ? {} : { maxAmountMinor },
        ),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.all });
      },
    },
  );
}

export function useReverseArReceipt() {
  const queryClient = useQueryClient();
  return useAuthorizedIdempotentMutation<
    { receipt: ArReceiptView; reversalJournal: Journal | null },
    Error,
    { receiptId: string; input: ReverseReceiptInput }
  >("accounting:receivables:approve", {
    mutationKey: ["accounting", "ar", "receipts", "reverse"],
    mutationFn: ({ receiptId, input }, idempotencyKey) =>
      apiClient.post<{ receipt: ArReceiptView; reversalJournal: Journal | null }>(
        `/accounting/ar/receipts/${receiptId}/reverse`,
        input,
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.all });
    },
  });
}

export function useArAging(query: AgingQuery = {}, options?: QueryOpts<AgingReport>) {
  const canRead = useCan(RECEIVABLES_READ);
  return useQuery<AgingReport, Error>({
    queryKey: accountingArQueryKeys.accountingAr.aging(agingParams(query)),
    queryFn: ({ signal }) =>
      apiClient.get<AgingReport>("/accounting/ar/aging", agingParams(query), signal),
    staleTime: STANDARD_LIST_STALE,
    placeholderData: keepPreviousData,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useArOpenItems(query: AgingQuery = {}, options?: QueryOpts<AgingOpenItem[]>) {
  const canRead = useCan(RECEIVABLES_READ);
  return useQuery<AgingOpenItem[], Error>({
    queryKey: accountingArQueryKeys.accountingAr.openItems(agingParams(query)),
    queryFn: ({ signal }) =>
      apiClient.get<AgingOpenItem[]>("/accounting/ar/aging/open-items", agingParams(query), signal),
    staleTime: STANDARD_LIST_STALE,
    placeholderData: keepPreviousData,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}
