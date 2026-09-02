"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Invoice, InvoiceItem, InvoiceStats, InvoiceStatus, PatchableInvoiceStatus, Payment, PaymentMethod } from "@/types/invoice";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import {
  invoiceContract,
  invoiceStatsContract,
  invoicesPageContract,
  type InvoicesResponse,
} from "@/hooks/api/invoice-schema";

interface InvoiceFilters {
  status?: InvoiceStatus;
  clientId?: number;
  page?: number;
  limit?: number;
}

interface CreateInvoiceItemInput {
  description: string;
  hsnSacCode?: string;
  quantity: number;
  rate: number;
  gstRate: number;
}

interface CreateInvoiceInput {
  clientId?: number;
  projectId?: number;
  lineItems?: InvoiceItem[];
  items?: CreateInvoiceItemInput[];
  taxRate?: number;
  discount?: number;
  currency?: string;
  dueDate?: string;
  notes?: string;
  status?: "DRAFT" | "ISSUED";
  placeOfSupply?: string;
  customerGstin?: string;
  supplierGstin?: string;
  reverseCharge?: boolean;
  taxInclusive?: boolean;
}

interface UpdateInvoiceInput extends Partial<Omit<CreateInvoiceInput, "status">> {
  id: number;
  status?: PatchableInvoiceStatus;
}

export const useInvoices = (
  filters?: InvoiceFilters,
  options?: Omit<
    UseQueryOptions<InvoicesResponse, Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<InvoicesResponse, Error>({
    queryKey: queryKeys.invoice.list(filters as Record<string, unknown>),
    queryFn: ({ signal }) =>
      apiClient.get("/invoices", {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.clientId ? { clientId: String(filters.clientId) } : {}),
        ...(filters?.page ? { page: String(filters.page) } : {}),
        ...(filters?.limit ? { limit: String(filters.limit) } : {}),
      }, signal, invoicesPageContract),
    staleTime: 2 * 60_000,
    ...options,
  });
};

export const useInvoice = (
  id: number,
  options?: Omit<
    UseQueryOptions<Invoice, Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) => {
  return useQuery<Invoice, Error>({
    queryKey: queryKeys.invoice.detail(id),
    queryFn: ({ signal }) => apiClient.get(`/invoices/${id}`, undefined, signal, invoiceContract),
    enabled: id > 0,
    staleTime: 2 * 60_000,
    ...options,
  });
};

export const useInvoiceStats = (
  options?: Omit<
    UseQueryOptions<InvoiceStats, Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<InvoiceStats, Error>({
    queryKey: queryKeys.invoice.stats(),
    queryFn: ({ signal }) => apiClient.get("/invoices/stats", undefined, signal, invoiceStatsContract),
    staleTime: 5 * 60_000,
    ...options,
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<Invoice, Error, CreateInvoiceInput>("accounting:create", {
    mutationKey: ["create", "invoice"],
    mutationFn: (data) => apiClient.post<Invoice>("/invoices", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoice.all });
    },
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, UpdateInvoiceInput>("accounting:update", {
    mutationKey: ["update", "invoice"],
    mutationFn: ({ id, ...data }) =>
      apiClient.patch<{ success: boolean }>(`/invoices/${id}`, data),
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoice.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoice.detail(vars.id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoice.stats() });
    },
  });
};

export const useVoidInvoice = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, number>("accounting:manage", {
    mutationKey: ["void", "invoice"],
    mutationFn: (id) =>
      apiClient.post<{ success: boolean }>(`/invoices/${id}/void`),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoice.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoice.detail(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoice.stats() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
    },
  });
};

interface RecordPaymentInput {
  invoiceId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
}

export const useRecordPayment = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<Payment, Error, RecordPaymentInput>("accounting:create", {
    mutationKey: ["record", "payment"],
    mutationFn: ({ invoiceId, ...data }) =>
      apiClient.post<Payment>(`/invoices/${invoiceId}/payments`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoice.all });
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.invoice.detail(variables.invoiceId), "payments"],
      });
    },
  });
};
