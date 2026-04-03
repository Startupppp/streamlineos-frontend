"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Invoice, InvoiceItem, InvoiceStats, InvoiceStatus } from "@/types/invoice";

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

interface CreateInvoiceInput {
  clientId?: number;
  projectId?: number;
  lineItems: InvoiceItem[];
  taxRate?: number;
  discount?: number;
  currency?: string;
  dueDate?: string;
  notes?: string;
}

interface UpdateInvoiceInput extends Partial<CreateInvoiceInput> {
  id: number;
  status?: "SENT" | "PAID" | "OVERDUE" | "CANCELLED";
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
    ...options,
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation<Invoice, Error, CreateInvoiceInput>({
    mutationFn: (data) => apiClient.post<Invoice>("/invoices", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoice.all });
    },
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, UpdateInvoiceInput>({
    mutationFn: ({ id, ...data }) =>
      apiClient.patch<{ success: boolean }>(`/invoices/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoice.all });
    },
  });
};
