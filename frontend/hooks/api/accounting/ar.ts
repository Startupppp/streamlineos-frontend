"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  ArPayment,
  ArPaymentMethod,
  CreditNote,
  CreditNoteStatus,
  RecurringInvoiceTemplate,
  CustomerStatement,
  RecordPaymentInput,
  CreateCreditNoteInput,
  ApplyCreditNoteInput,
  CreateRecurringTemplateInput,
  UpdateRecurringTemplateInput,
} from "@/types/accounting/ar";

const base = ["streamlineos", "accounting"] as const;

const arKeys = {
  creditNotes: {
    all: [...base, "credit-notes"] as const,
    list: (p?: unknown) => [...base, "credit-notes", "list", p] as const,
    detail: (id: number) => [...base, "credit-notes", id] as const,
  },
  recurringTemplates: {
    all: [...base, "recurring-templates"] as const,
    list: (p?: unknown) => [...base, "recurring-templates", "list", p] as const,
    detail: (id: number) => [...base, "recurring-templates", id] as const,
  },
  statements: {
    detail: (clientId: number, p?: unknown) =>
      [...base, "statement", clientId, p] as const,
  },
  arPayments: {
    all: [...base, "ar-payments"] as const,
    list: (p?: unknown) => [...base, "ar-payments", "list", p] as const,
  },
};

interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function toQuery<P extends object>(params: P): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = String(v);
  }
  return out;
}

export interface ListCreditNotesParams {
  status?: CreditNoteStatus;
  clientId?: number;
  page?: number;
  pageSize?: number;
}

export function useCreditNotes(params: ListCreditNotesParams = {}) {
  return useQuery<ListResponse<CreditNote>, Error>({
    queryKey: arKeys.creditNotes.list(params),
    queryFn: () =>
      apiClient.get<ListResponse<CreditNote>>(
        "/accounting/credit-notes",
        toQuery(params),
      ),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useCreditNote(id: number) {
  return useQuery<CreditNote, Error>({
    queryKey: arKeys.creditNotes.detail(id),
    queryFn: () => apiClient.get<CreditNote>(`/accounting/credit-notes/${id}`),
    enabled: Number.isInteger(id) && id > 0,
    staleTime: 60_000,
  });
}

export interface ListRecurringTemplatesParams {
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export function useRecurringTemplates(params: ListRecurringTemplatesParams = {}) {
  return useQuery<ListResponse<RecurringInvoiceTemplate>, Error>({
    queryKey: arKeys.recurringTemplates.list(params),
    queryFn: () =>
      apiClient.get<ListResponse<RecurringInvoiceTemplate>>(
        "/accounting/recurring-invoices",
        toQuery(params),
      ),
    staleTime: 60_000,
  });
}

export function useRecurringTemplate(id: number) {
  return useQuery<RecurringInvoiceTemplate, Error>({
    queryKey: arKeys.recurringTemplates.detail(id),
    queryFn: () =>
      apiClient.get<RecurringInvoiceTemplate>(`/accounting/recurring-invoices/${id}`),
    enabled: Number.isInteger(id) && id > 0,
    staleTime: 60_000,
  });
}

export interface CustomerStatementParams {
  from?: string;
  to?: string;
}

export function useCustomerStatement(
  clientId: number,
  params: CustomerStatementParams = {},
  enabled = true,
) {
  return useQuery<CustomerStatement, Error>({
    queryKey: arKeys.statements.detail(clientId, params),
    queryFn: () =>
      apiClient.get<CustomerStatement>(
        `/accounting/customer-statements/${clientId}`,
        toQuery(params),
      ),
    enabled: enabled && Number.isInteger(clientId) && clientId > 0,
    staleTime: 60_000,
  });
}

export interface ArPaymentsParams {
  method?: ArPaymentMethod;
  clientId?: number;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export function useArPayments(params: ArPaymentsParams = {}) {
  return useQuery<ListResponse<ArPayment>, Error>({
    queryKey: arKeys.arPayments.list(params),
    queryFn: () =>
      apiClient.get<ListResponse<ArPayment>>(
        "/accounting/ar-payments",
        toQuery(params),
      ),
    staleTime: 30_000,
  });
}

export function useVoidInvoice() {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; status: string }, Error, { invoiceId: number }>({
    mutationKey: ["void-invoice"],
    mutationFn: ({ invoiceId }) =>
      apiClient.post<{ id: number; status: string }>(
        `/invoices/${invoiceId}/void`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoice.all });
    },
  });
}

export function useRecordPaymentWithAllocations() {
  const queryClient = useQueryClient();
  return useMutation<
    { id: number },
    Error,
    { invoiceId: number } & RecordPaymentInput
  >({
    mutationKey: ["record-payment-ar"],
    mutationFn: ({ invoiceId, ...body }) =>
      apiClient.post<{ id: number }>(`/invoices/${invoiceId}/payments`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoice.all });
    },
  });
}

export function useCreateCreditNote() {
  const queryClient = useQueryClient();
  return useMutation<CreditNote, Error, CreateCreditNoteInput>({
    mutationKey: ["create-credit-note"],
    mutationFn: (body) =>
      apiClient.post<CreditNote>("/accounting/credit-notes", body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: arKeys.creditNotes.all,
        exact: false,
      });
    },
  });
}

export function usePostCreditNote() {
  const queryClient = useQueryClient();
  return useMutation<
    { id: number; status: string; needsApproval?: boolean },
    Error,
    { creditNoteId: number }
  >({
    mutationKey: ["post-credit-note"],
    mutationFn: ({ creditNoteId }) =>
      apiClient.post<{ id: number; status: string; needsApproval?: boolean }>(
        `/accounting/credit-notes/${creditNoteId}/post`,
      ),
    onSuccess: (_data, { creditNoteId }) => {
      queryClient.invalidateQueries({
        queryKey: arKeys.creditNotes.detail(creditNoteId),
      });
      queryClient.invalidateQueries({
        queryKey: arKeys.creditNotes.all,
        exact: false,
      });
    },
  });
}

export function useApplyCreditNote() {
  const queryClient = useQueryClient();
  return useMutation<
    { id: number; invoiceId: number; appliedAmount: number },
    Error,
    { creditNoteId: number } & ApplyCreditNoteInput
  >({
    mutationKey: ["apply-credit-note"],
    mutationFn: ({ creditNoteId, ...body }) =>
      apiClient.post<{ id: number; invoiceId: number; appliedAmount: number }>(
        `/accounting/credit-notes/${creditNoteId}/apply`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: arKeys.creditNotes.all,
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoice.all });
    },
  });
}

export function useCreateRecurringTemplate() {
  const queryClient = useQueryClient();
  return useMutation<RecurringInvoiceTemplate, Error, CreateRecurringTemplateInput>({
    mutationKey: ["create-recurring-template"],
    mutationFn: (body) =>
      apiClient.post<RecurringInvoiceTemplate>("/accounting/recurring-invoices", body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: arKeys.recurringTemplates.all,
        exact: false,
      });
    },
  });
}

export function useUpdateRecurringTemplate() {
  const queryClient = useQueryClient();
  return useMutation<
    RecurringInvoiceTemplate,
    Error,
    { templateId: number } & UpdateRecurringTemplateInput
  >({
    mutationKey: ["update-recurring-template"],
    mutationFn: ({ templateId, ...body }) =>
      apiClient.patch<RecurringInvoiceTemplate>(
        `/accounting/recurring-invoices/${templateId}`,
        body,
      ),
    onSuccess: (_data, { templateId }) => {
      queryClient.invalidateQueries({
        queryKey: arKeys.recurringTemplates.all,
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: arKeys.recurringTemplates.detail(templateId),
      });
    },
  });
}

export function useDeleteRecurringTemplate() {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; deleted: boolean }, Error, { templateId: number }>({
    mutationKey: ["delete-recurring-template"],
    mutationFn: ({ templateId }) =>
      apiClient.delete<{ id: number; deleted: boolean }>(
        `/accounting/recurring-invoices/${templateId}`,
      ),
    onSuccess: (_data, { templateId }) => {
      queryClient.invalidateQueries({
        queryKey: arKeys.recurringTemplates.all,
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: arKeys.recurringTemplates.detail(templateId),
      });
    },
  });
}

export function useRunRecurringTemplate() {
  const queryClient = useQueryClient();
  return useMutation<{ invoiceId: number }, Error, { templateId: number }>({
    mutationKey: ["run-recurring-template"],
    mutationFn: ({ templateId }) =>
      apiClient.post<{ invoiceId: number }>(
        `/accounting/recurring-invoices/${templateId}/run-now`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: arKeys.recurringTemplates.all,
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoice.all });
    },
  });
}

export * from "./ar-collections";
