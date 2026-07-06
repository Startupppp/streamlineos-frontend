"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import type {
  BillingExportInput,
  BillingUninvoiced,
  InvoiceDraftInput,
  RatePreview,
} from "@/features/timesheets-core/types";

interface UninvoicedQuery {
  startDate?: string;
  endDate?: string;
  projectId?: number;
}

export function useBillingUninvoiced(query: UninvoicedQuery = {}, enabled = true) {
  const params = { startDate: query.startDate, endDate: query.endDate, projectId: query.projectId };
  return useQuery({
    queryKey: queryKeys.timesheets.billingUninvoiced(params),
    queryFn: () => apiClient.get<BillingUninvoiced>("/timesheets/billing/uninvoiced", params),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    enabled,
  });
}

interface RatePreviewQuery {
  projectId?: number;
  userId?: string;
  ticketId?: number;
}

export function useRatePreview(query: RatePreviewQuery, enabled = true) {
  const params: Record<string, unknown> = {
    projectId: query.projectId,
    userId: query.userId,
    ticketId: query.ticketId,
  };
  return useQuery({
    queryKey: queryKeys.timesheets.ratePreview(params),
    queryFn: () => apiClient.get<RatePreview>("/timesheets/billing/rate-preview", params),
    staleTime: 60_000,
    enabled,
  });
}

export function useBillingExport() {
  return useMutation({
    mutationKey: ["timesheets", "billing", "export"],
    mutationFn: (data: BillingExportInput) =>
      apiClient.post<{ exportId: number; entryCount: number; totalHours: number; totalAmount: number }>(
        "/timesheets/billing/export",
        data,
      ),
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useCreateInvoiceDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "billing", "invoice-draft"],
    mutationFn: (data: InvoiceDraftInput) =>
      apiClient.post<{ exportId: number; entryCount: number; amount: number }>(
        "/timesheets/billing/create-invoice-draft",
        data,
      ),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.all });
      toast.success(`Invoice draft created for ${res.entryCount} entries`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
