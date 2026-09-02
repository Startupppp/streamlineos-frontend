"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { CursorPage } from "@/hooks/api/accounting";
import type {
  ArPayment,
  ArPaymentMethod,
  CreditNote,
  CreditNoteStatus,
  RecurringInvoiceTemplate,
  RecordPaymentInput,
  CreateCreditNoteInput,
  ApplyCreditNoteInput,
  CreateRecurringTemplateInput,
  UpdateRecurringTemplateInput,
} from "@/types/accounting/ar";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { queryKeyBase } from "@/lib/query-keys/base";

const base = [...queryKeyBase, "accounting"] as const;

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
  arPayments: {
    all: [...base, "ar-payments"] as const,
    list: (p?: unknown) => [...base, "ar-payments", "list", p] as const,
  },
};

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
  cursor?: string;
  limit?: number;
}

export function useCreditNotes(params: ListCreditNotesParams = {}) {
  const can = useCan("accounting:credit-notes:read");
  return useQuery<CursorPage<CreditNote>, Error>({
    queryKey: arKeys.creditNotes.list(params),
    queryFn: ({ signal }) =>
      apiClient.get<CursorPage<CreditNote>>(
        "/accounting/credit-notes",
        toQuery(params), signal,
      ),
    staleTime: 30_000,
    enabled: can,
  });
}

export interface ListRecurringTemplatesParams {
  isActive?: boolean;
  cursor?: string;
  limit?: number;
}

export function useRecurringTemplates(
  params: ListRecurringTemplatesParams = {},
) {
  const can = useCan("accounting:recurring:read");
  return useQuery<CursorPage<RecurringInvoiceTemplate>, Error>({
    queryKey: arKeys.recurringTemplates.list(params),
    queryFn: ({ signal }) =>
      apiClient.get<CursorPage<RecurringInvoiceTemplate>>(
        "/accounting/recurring-invoices",
        toQuery(params), signal,
      ),
    staleTime: 60_000,
    enabled: can,
  });
}

export interface ArPaymentsParams {
  method?: ArPaymentMethod;
  clientId?: number;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

export function useArPayments(params: ArPaymentsParams = {}) {
  const can = useCan("accounting:receivables:read");
  return useQuery<CursorPage<ArPayment>, Error>({
    queryKey: arKeys.arPayments.list(params),
    queryFn: ({ signal }) =>
      apiClient.get<CursorPage<ArPayment>>(
        "/accounting/ar-payments",
        toQuery(params), signal,
      ),
    staleTime: 30_000,
    enabled: can,
  });
}

export function useVoidInvoice() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    { id: number; status: string },
    Error,
    { invoiceId: number }
  >("accounting:manage", {
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
  return useAuthorizedMutation<
    { id: number },
    Error,
    { invoiceId: number } & RecordPaymentInput
  >("accounting:create", {
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
  return useAuthorizedMutation<CreditNote, Error, CreateCreditNoteInput>("accounting:credit-notes:create", {
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
  return useAuthorizedMutation<
    { id: number; status: string; needsApproval?: boolean },
    Error,
    { creditNoteId: number }
  >("accounting:credit-notes:manage", {
    mutationKey: ["post-credit-note"],
    mutationFn: ({ creditNoteId }) =>
      apiClient.post<{ id: number; status: string; needsApproval?: boolean }>(
        `/accounting/credit-notes/${creditNoteId}/post`,
      ),
    onSuccess: (_, { creditNoteId }) => {
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
  return useAuthorizedMutation<
    { id: number; invoiceId: number; appliedAmount: number },
    Error,
    { creditNoteId: number } & ApplyCreditNoteInput
  >("accounting:credit-notes:manage", {
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
  return useAuthorizedMutation<
    RecurringInvoiceTemplate,
    Error,
    CreateRecurringTemplateInput
  >("accounting:recurring:manage", {
    mutationKey: ["create-recurring-template"],
    mutationFn: (body) =>
      apiClient.post<RecurringInvoiceTemplate>(
        "/accounting/recurring-invoices",
        body,
      ),
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
  return useAuthorizedMutation<
    RecurringInvoiceTemplate,
    Error,
    { templateId: number } & UpdateRecurringTemplateInput
  >("accounting:recurring:manage", {
    mutationKey: ["update-recurring-template"],
    mutationFn: ({ templateId, ...body }) =>
      apiClient.patch<RecurringInvoiceTemplate>(
        `/accounting/recurring-invoices/${templateId}`,
        body,
      ),
    onSuccess: (_, { templateId }) => {
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
  return useAuthorizedMutation<
    { id: number; deleted: boolean },
    Error,
    { templateId: number }
  >("accounting:recurring:manage", {
    mutationKey: ["delete-recurring-template"],
    mutationFn: ({ templateId }) =>
      apiClient.delete<{ id: number; deleted: boolean }>(
        `/accounting/recurring-invoices/${templateId}`,
      ),
    onSuccess: (_, { templateId }) => {
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
  return useAuthorizedMutation<{ invoiceId: number }, Error, { templateId: number }>("accounting:recurring:manage", {
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
