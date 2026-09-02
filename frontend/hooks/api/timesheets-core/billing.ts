"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import type {
  BillingExportInput,
  BillingUninvoiced,
  InvoiceDraftInput,
} from "@/features/timesheets/types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

interface UninvoicedQuery {
  startDate?: string;
  endDate?: string;
  projectId?: number;
}

export function useBillingUninvoiced(query: UninvoicedQuery = {}, enabled = true) {
  const canView = useCan("timesheets:billing:view");
  const params = { startDate: query.startDate, endDate: query.endDate, projectId: query.projectId };
  return useQuery({
    queryKey: queryKeys.timesheets.billingUninvoiced(params),
    queryFn: ({ signal }) => apiClient.get<BillingUninvoiced>("/timesheets/billing/uninvoiced", params, signal),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    enabled: enabled && canView,
  });
}


export function useBillingExport() {
  return useAuthorizedMutation("timesheets:billing:export", {
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
  return useAuthorizedMutation("timesheets:billing:invoice", {
    mutationKey: ["timesheets", "billing", "invoice-draft"],
    mutationFn: (data: InvoiceDraftInput) =>
      apiClient.post<{ exportId: number; entryCount: number; amount: number }>(
        "/timesheets/billing/create-invoice-draft",
        data,
      ),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.billingUninvoiced() });
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.entries() });
      toast.success(`Invoice draft created for ${res.entryCount} entries`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
