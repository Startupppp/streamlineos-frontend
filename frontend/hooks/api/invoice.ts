"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Invoice, InvoiceItem, InvoiceStats, InvoiceStatus, Payment, PaymentMethod } from "@/types/invoice";

interface InvoicesResponse {
  items: Invoice[];
  total: number;
  page: number;
  totalPages: number;
}

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
  status?: InvoiceStatus;
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
    queryFn: () =>
      apiClient.get<InvoicesResponse>("/invoices", {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.clientId ? { clientId: String(filters.clientId) } : {}),
        ...(filters?.page ? { page: String(filters.page) } : {}),
        ...(filters?.limit ? { limit: String(filters.limit) } : {}),
      }),
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
    queryFn: () => apiClient.get<Invoice>(`/invoices/${id}`),
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
    queryFn: () => apiClient.get<InvoiceStats>("/invoices/stats"),
    staleTime: 5 * 60_000,
    ...options,
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation<Invoice, Error, CreateInvoiceInput>({
    mutationKey: ["create", "invoice"],
    mutationFn: (data) => apiClient.post<Invoice>("/invoices", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoice.all });
    },
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, UpdateInvoiceInput>({
    mutationKey: ["update", "invoice"],
    mutationFn: ({ id, ...data }) =>
      apiClient.patch<{ success: boolean }>(`/invoices/${id}`, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoice.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoice.detail(vars.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoice.stats() });
    },
  });
};

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["delete", "invoice"],
    mutationFn: (id) =>
      apiClient.delete<{ success: boolean }>(`/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoice.all });
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
  return useMutation<Payment, Error, RecordPaymentInput>({
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
