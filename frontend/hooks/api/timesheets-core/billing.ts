"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import type {
  BillingExportInput,
  BillingUninvoiced,
  InvoiceDraftInput,
} from "@/features/timesheets/types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const billingUninvoicedC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-schema").then((m) => m.billingUninvoicedResponseContract),
);
const billingExportC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-schema").then((m) => m.billingExportResponseContract),
);
const billingInvoiceDraftC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-schema").then((m) => m.billingInvoiceDraftResponseContract),
);

interface UninvoicedQuery {
  startDate?: string;
  endDate?: string;
  projectId?: number;
}

export function useBillingUninvoiced(query: UninvoicedQuery = {}, enabled = true) {
  const canView = useCan("timesheets:billing:view");
  const params = { startDate: query.startDate, endDate: query.endDate, projectId: query.projectId };
  return useQuery({
    queryKey: usersAndCommerceQueryKeys.timesheets.billingUninvoiced(params),
    queryFn: ({ signal }) => apiClient.get<BillingUninvoiced>("/timesheets/billing/uninvoiced", params, signal, billingUninvoicedC),
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
        undefined,
        billingExportC,
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
        undefined,
        billingInvoiceDraftC,
      ),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.billingUninvoiced() });
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.entries() });
      toast.success(`Invoice draft created for ${res.entryCount} entries`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
