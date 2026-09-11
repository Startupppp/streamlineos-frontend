"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { accountingArQueryKeys } from "@/lib/query-keys/accounting-ar";
import { useCan } from "@/hooks/api/access";
import type { Journal } from "@/types/accounting-kernel";
import type {
  AgingQuery,
  AgingReport,
  AgingOpenItem,
  AllocationLineInput,
  ArDocumentPage,
  ArDocumentView,
  ArReceiptPage,
  ArReceiptView,
  CreateCreditNoteInput,
  CreateInvoiceInput,
  CreateReceiptInput,
  CreditNoteAllocationResult,
  CreditNoteFromInvoiceInput,
  DeletedResult,
  FrozenTaxLine,
  ListArDocumentsQuery,
  ListReceiptsQuery,
  ReverseReceiptInput,
  TaxPreview,
  UpdateArDraftInput,
} from "@/types/accounting-ar";

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

const INVOICES_PATH = "/accounting/ar/invoices";
const CREDIT_NOTES_PATH = "/accounting/ar/credit-notes";
const RECEIPTS_PATH = "/accounting/ar/receipts";
const AGING_PATH = "/accounting/ar/aging";

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
    queryFn: () => apiClient.get<ArDocumentPage>(INVOICES_PATH, documentParams(query)),
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
    queryFn: () => apiClient.get<ArDocumentView>(`${INVOICES_PATH}/${invoiceId}`),
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
    queryFn: () => apiClient.get<TaxPreview>(`${INVOICES_PATH}/${invoiceId}/tax-preview`),
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
    queryFn: () => apiClient.get<FrozenTaxLine[]>(`${INVOICES_PATH}/${invoiceId}/tax-lines`),
    staleTime: ENTITY_STALE,
    ...options,
    enabled: canRead && !!invoiceId && (options?.enabled ?? true),
  });
}

export function useCreateArInvoice() {
  const queryClient = useQueryClient();
  return useMutation<ArDocumentView, Error, CreateInvoiceInput>({
    mutationKey: ["accounting", "ar", "invoices", "create"],
    mutationFn: (input) => apiClient.post<ArDocumentView>(INVOICES_PATH, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.all });
    },
  });
}

export function useUpdateArInvoiceDraft() {
  const queryClient = useQueryClient();
  return useMutation<ArDocumentView, Error, { invoiceId: string; input: UpdateArDraftInput }>({
    mutationKey: ["accounting", "ar", "invoices", "update"],
    mutationFn: ({ invoiceId, input }) =>
      apiClient.patch<ArDocumentView>(`${INVOICES_PATH}/${invoiceId}`, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.invoice(variables.invoiceId) });
      queryClient.invalidateQueries({ queryKey: [...accountingArQueryKeys.accountingAr.all, "invoices"] });
    },
  });
}

export function useDeleteArInvoiceDraft() {
  const queryClient = useQueryClient();
  return useMutation<DeletedResult, Error, string>({
    mutationKey: ["accounting", "ar", "invoices", "delete"],
    mutationFn: (invoiceId) => apiClient.delete<DeletedResult>(`${INVOICES_PATH}/${invoiceId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.all });
    },
  });
}

export function usePostArInvoice() {
  const queryClient = useQueryClient();
  return useMutation<{ document: ArDocumentView; journal: Journal }, Error, string>({
    mutationKey: ["accounting", "ar", "invoices", "post"],
    mutationFn: (invoiceId) =>
      apiClient.post<{ document: ArDocumentView; journal: Journal }>(
        `${INVOICES_PATH}/${invoiceId}/post`,
        {},
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.all });
    },
  });
}

export function useCreditNoteFromInvoice() {
  const queryClient = useQueryClient();
  return useMutation<
    ArDocumentView,
    Error,
    { invoiceId: string; input: CreditNoteFromInvoiceInput }
  >({
    mutationKey: ["accounting", "ar", "invoices", "creditNote"],
    mutationFn: ({ invoiceId, input }) =>
      apiClient.post<ArDocumentView>(`${INVOICES_PATH}/${invoiceId}/credit-note`, input),
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
    queryFn: () => apiClient.get<ArDocumentPage>(CREDIT_NOTES_PATH, documentParams(query)),
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
    queryFn: () => apiClient.get<ArDocumentView>(`${CREDIT_NOTES_PATH}/${creditNoteId}`),
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
    queryFn: () => apiClient.get<TaxPreview>(`${CREDIT_NOTES_PATH}/${creditNoteId}/tax-preview`),
    staleTime: LIVE_STALE,
    placeholderData: keepPreviousData,
    retry: false,
    ...options,
    enabled: canRead && !!creditNoteId && (options?.enabled ?? true),
  });
}

export function useCreateCreditNote() {
  const queryClient = useQueryClient();
  return useMutation<ArDocumentView, Error, CreateCreditNoteInput>({
    mutationKey: ["accounting", "ar", "creditNotes", "create"],
    mutationFn: (input) => apiClient.post<ArDocumentView>(CREDIT_NOTES_PATH, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.all });
    },
  });
}

export function useUpdateCreditNoteDraft() {
  const queryClient = useQueryClient();
  return useMutation<ArDocumentView, Error, { creditNoteId: string; input: UpdateArDraftInput }>({
    mutationKey: ["accounting", "ar", "creditNotes", "update"],
    mutationFn: ({ creditNoteId, input }) =>
      apiClient.patch<ArDocumentView>(`${CREDIT_NOTES_PATH}/${creditNoteId}`, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: accountingArQueryKeys.accountingAr.creditNote(variables.creditNoteId),
      });
      queryClient.invalidateQueries({ queryKey: [...accountingArQueryKeys.accountingAr.all, "creditNotes"] });
    },
  });
}

export function useDeleteCreditNoteDraft() {
  const queryClient = useQueryClient();
  return useMutation<DeletedResult, Error, string>({
    mutationKey: ["accounting", "ar", "creditNotes", "delete"],
    mutationFn: (creditNoteId) =>
      apiClient.delete<DeletedResult>(`${CREDIT_NOTES_PATH}/${creditNoteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.all });
    },
  });
}

export function usePostCreditNote() {
  const queryClient = useQueryClient();
  return useMutation<{ document: ArDocumentView; journal: Journal }, Error, string>({
    mutationKey: ["accounting", "ar", "creditNotes", "post"],
    mutationFn: (creditNoteId) =>
      apiClient.post<{ document: ArDocumentView; journal: Journal }>(
        `${CREDIT_NOTES_PATH}/${creditNoteId}/post`,
        {},
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.all });
    },
  });
}

export function useAllocateCreditNote() {
  const queryClient = useQueryClient();
  return useMutation<
    CreditNoteAllocationResult,
    Error,
    { creditNoteId: string; allocations: AllocationLineInput[] }
  >({
    mutationKey: ["accounting", "ar", "creditNotes", "allocate"],
    mutationFn: ({ creditNoteId, allocations }) =>
      apiClient.post<CreditNoteAllocationResult>(
        `${CREDIT_NOTES_PATH}/${creditNoteId}/allocations`,
        { allocations },
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
    queryFn: () => apiClient.get<ArReceiptPage>(RECEIPTS_PATH, receiptParams(query)),
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
    queryFn: () => apiClient.get<ArReceiptView>(`${RECEIPTS_PATH}/${receiptId}`),
    staleTime: ENTITY_STALE,
    ...options,
    enabled: canRead && !!receiptId && (options?.enabled ?? true),
  });
}

export function useCreateArReceipt() {
  const queryClient = useQueryClient();
  return useMutation<{ receipt: ArReceiptView; journal: Journal }, Error, CreateReceiptInput>({
    mutationKey: ["accounting", "ar", "receipts", "create"],
    mutationFn: (input) =>
      apiClient.post<{ receipt: ArReceiptView; journal: Journal }>(RECEIPTS_PATH, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.all });
    },
  });
}

export function useAllocateArReceipt() {
  const queryClient = useQueryClient();
  return useMutation<
    ArReceiptView,
    Error,
    { receiptId: string; allocations: AllocationLineInput[] }
  >({
    mutationKey: ["accounting", "ar", "receipts", "allocate"],
    mutationFn: ({ receiptId, allocations }) =>
      apiClient.post<ArReceiptView>(`${RECEIPTS_PATH}/${receiptId}/allocations`, { allocations }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.all });
    },
  });
}

export function useAllocateArReceiptFifo() {
  const queryClient = useQueryClient();
  return useMutation<ArReceiptView, Error, { receiptId: string; maxAmountMinor?: number }>({
    mutationKey: ["accounting", "ar", "receipts", "allocateFifo"],
    mutationFn: ({ receiptId, maxAmountMinor }) =>
      apiClient.post<ArReceiptView>(
        `${RECEIPTS_PATH}/${receiptId}/allocations/fifo`,
        maxAmountMinor === undefined ? {} : { maxAmountMinor },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingArQueryKeys.accountingAr.all });
    },
  });
}

export function useReverseArReceipt() {
  const queryClient = useQueryClient();
  return useMutation<
    { receipt: ArReceiptView; reversalJournal: Journal | null },
    Error,
    { receiptId: string; input: ReverseReceiptInput }
  >({
    mutationKey: ["accounting", "ar", "receipts", "reverse"],
    mutationFn: ({ receiptId, input }) =>
      apiClient.post<{ receipt: ArReceiptView; reversalJournal: Journal | null }>(
        `${RECEIPTS_PATH}/${receiptId}/reverse`,
        input,
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
    queryFn: () => apiClient.get<AgingReport>(AGING_PATH, agingParams(query)),
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
    queryFn: () => apiClient.get<AgingOpenItem[]>(`${AGING_PATH}/open-items`, agingParams(query)),
    staleTime: STANDARD_LIST_STALE,
    placeholderData: keepPreviousData,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}
