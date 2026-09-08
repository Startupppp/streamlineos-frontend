"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import type { Invoice, InvoiceStats, InvoiceStatus, PatchableInvoiceStatus, Payment, PaymentMethod } from "@/types/invoice";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";
import type { InvoicesResponse } from "@/hooks/api/invoice-schema";

/**
 * Deferred: `hooks/api/index.ts` re-exports this module, so a value import of
 * `invoice-schema` charged every barrel consumer for Zod's runtime.
 */
const oneInvoiceContract = lazyContract(() =>
  import("@/hooks/api/invoice-schema").then((m) => m.invoiceContract),
);
const statsContract = lazyContract(() =>
  import("@/hooks/api/invoice-schema").then((m) => m.invoiceStatsContract),
);
const pageContract = lazyContract(() =>
  import("@/hooks/api/invoice-schema").then((m) => m.invoicesPageContract),
);
const invoiceCreatedContract = lazyContract(() =>
  import("@/hooks/api/invoice-schema").then((m) => m.invoiceContract),
);
const invoiceSuccessContract = lazyContract(() =>
  import("@/hooks/api/invoice-schema").then((m) => m.invoiceSuccessContract),
);
const invoicePaymentCreatedContract = lazyContract(() =>
  import("@/hooks/api/invoice-schema").then((m) => m.invoicePaymentContract),
);
import { useGatedQuery } from "@/hooks/api/gated-query";

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

// The write shape the backend's createInvoiceSchema accepts — numbers, unlike the persisted row.
interface LegacyLineItemInput {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface CreateInvoiceInput {
  clientId?: number;
  projectId?: number;
  lineItems?: LegacyLineItemInput[];
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
  return useGatedQuery<InvoicesResponse, Error>("accounting:read", {
    queryKey: platformCoreQueryKeys.invoice.list(filters),
    queryFn: ({ signal }) =>
      apiClient.get("/invoices", {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.clientId ? { clientId: String(filters.clientId) } : {}),
        ...(filters?.page ? { page: String(filters.page) } : {}),
        ...(filters?.limit ? { limit: String(filters.limit) } : {}),
      }, signal, pageContract),
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
  return useGatedQuery<Invoice, Error>("accounting:read", {
    queryKey: platformCoreQueryKeys.invoice.detail(id),
    queryFn: ({ signal }) => apiClient.get(`/invoices/${id}`, undefined, signal, oneInvoiceContract),
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
  return useGatedQuery<InvoiceStats, Error>("accounting:read", {
    queryKey: platformCoreQueryKeys.invoice.stats(),
    queryFn: ({ signal }) => apiClient.get("/invoices/stats", undefined, signal, statsContract),
    staleTime: 5 * 60_000,
    ...options,
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<Invoice, Error, CreateInvoiceInput>("accounting:create", {
    mutationKey: ["create", "invoice"],
    mutationFn: (data) => apiClient.post("/invoices", data, undefined, invoiceCreatedContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.invoice.all });
    },
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, UpdateInvoiceInput>("accounting:update", {
    mutationKey: ["update", "invoice"],
    mutationFn: ({ id, ...data }) =>
      apiClient.patch(`/invoices/${id}`, data, undefined, invoiceSuccessContract),
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.invoice.all });
      void queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.invoice.detail(vars.id) });
      void queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.invoice.stats() });
    },
  });
};

export const useVoidInvoice = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, number>("accounting:manage", {
    mutationKey: ["void", "invoice"],
    mutationFn: (id) =>
      apiClient.post(`/invoices/${id}/void`, undefined, undefined, invoiceSuccessContract),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.invoice.all });
      void queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.invoice.detail(id) });
      void queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.invoice.stats() });
      void queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.all });
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
      apiClient.post(`/invoices/${invoiceId}/payments`, data, undefined, invoicePaymentCreatedContract),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.invoice.all });
      queryClient.invalidateQueries({
        queryKey: [...platformCoreQueryKeys.invoice.detail(variables.invoiceId), "payments"],
      });
    },
  });
};
