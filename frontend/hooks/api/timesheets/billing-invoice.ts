"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  InvoiceFromTimesheetsResult,
  UninvoicedEntry,
} from "@/hooks/api/timesheets/billing-invoice-schema";

const uninvoicedEntriesC = lazyContract(() =>
  import("@/hooks/api/timesheets/billing-invoice-schema").then(
    (m) => m.uninvoicedEntriesResponseContract,
  ),
);
const invoiceFromTimesheetsC = lazyContract(() =>
  import("@/hooks/api/timesheets/billing-invoice-schema").then(
    (m) => m.invoiceFromTimesheetsResponseContract,
  ),
);

export const UNINVOICED_ENTRY_CAP = 100;

export interface UninvoicedEntriesQuery {
  startDate?: string;
  endDate?: string;
  projectId?: number;
  limit?: number;
}

export interface GenerateInvoiceFromTimesheetsInput {
  timesheetEntryIds: number[];
  projectId?: number;
  clientId?: number;
  gstRate?: number;
  discount?: number;
  currency?: string;
  dueDate?: string;
  notes?: string;
  status?: "DRAFT" | "ISSUED";
}

export function useUninvoicedEntries(
  query: UninvoicedEntriesQuery = {},
  options?: { enabled?: boolean },
) {
  const canView = useCan("timesheets:billing:view");
  const params = {
    startDate: query.startDate,
    endDate: query.endDate,
    projectId: query.projectId,
    limit: query.limit ?? UNINVOICED_ENTRY_CAP,
  };
  return useQuery({
    queryKey: usersAndCommerceQueryKeys.timesheets.billingUninvoiced({
      view: "entries",
      ...params,
    }),
    queryFn: ({ signal }) =>
      apiClient.get<{ items: UninvoicedEntry[] }>(
        "/timesheets/billing/uninvoiced-entries",
        params,
        signal,
        uninvoicedEntriesC,
      ),
    staleTime: 30_000,
    enabled: canView && (options?.enabled ?? true),
  });
}

export function useGenerateInvoiceFromTimesheets() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    InvoiceFromTimesheetsResult,
    Error,
    GenerateInvoiceFromTimesheetsInput
  >("accounting:create", {
    mutationKey: ["timesheets", "billing", "generate-invoice"],
    mutationFn: (data: GenerateInvoiceFromTimesheetsInput) =>
      apiClient.post<InvoiceFromTimesheetsResult>(
        "/invoices/from-timesheets",
        data,
        undefined,
        invoiceFromTimesheetsC,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: usersAndCommerceQueryKeys.timesheets.billingUninvoiced(),
      });
      void qc.invalidateQueries({
        queryKey: usersAndCommerceQueryKeys.timesheets.entries(),
      });
      void qc.invalidateQueries({ queryKey: platformCoreQueryKeys.invoice.all });
    },
  });
}
