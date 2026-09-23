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
} from "@/features/timesheets/billing-types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const billingUninvoicedC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-billing-schema").then((m) => m.billingUninvoicedResponseContract),
);
const billingExportC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-billing-schema").then((m) => m.billingExportResponseContract),
);
const billingInvoiceDraftC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-billing-schema").then((m) => m.billingInvoiceDraftResponseContract),
);
const billingReleaseDraftC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-billing-schema").then((m) => m.billingReleaseDraftResponseContract),
);

type UninvoicedQuery = {
  startDate?: string;
  endDate?: string;
  projectId?: number;
};

export function useBillingUninvoiced(query: UninvoicedQuery = {}, enabled = true) {
  const canView = useCan("timesheets:billing:view");
  const params: UninvoicedQuery = { startDate: query.startDate, endDate: query.endDate, projectId: query.projectId };
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
      apiClient.post<{
        exportId: number;
        entryCount: number;
        totalHours: number;
        totalAmount: number;
        fileName?: string;
        csv?: string;
      }>(
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

/**
 * Reverses `useCreateInvoiceDraft`: puts entries stuck at `INVOICE_DRAFTED`
 * back to billable when the draft never became a real invoice — the fix for
 * a stranded entry `entries.service.ts`'s `voidEntry` otherwise refuses to
 * touch (it blocks voiding anything already drafted or invoiced).
 */
export function useReleaseInvoiceDraft() {
  const qc = useQueryClient();
  return useAuthorizedMutation("timesheets:billing:invoice", {
    mutationKey: ["timesheets", "billing", "release-draft"],
    mutationFn: (data: { timesheetEntryIds: number[] }) =>
      apiClient.post<{ releasedEntryIds: number[] }>(
        "/timesheets/billing/release-draft",
        data,
        undefined,
        billingReleaseDraftC,
      ),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.billingUninvoiced() });
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.entries() });
      toast.success(
        `${res.releasedEntryIds.length} entr${res.releasedEntryIds.length === 1 ? "y" : "ies"} released back to billable`,
      );
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
