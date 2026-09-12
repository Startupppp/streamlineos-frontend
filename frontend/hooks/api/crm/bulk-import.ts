"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import type { BulkImportResult } from "@/features/crm/import/bulk-import-entities";

import { lazyContract } from "@/lib/api-envelope";
const bulkImportResultLazy = lazyContract(() => import("@/hooks/api/crm/bulk-import-schema").then((m) => m.bulkImportResultContract));

type BulkImportBody = Record<string, unknown>;

function useImportInvalidate(queryKey: readonly unknown[]) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey });
    void queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
  };
}

export function useBulkImportLeads() {
  const invalidate = useImportInvalidate(queryKeys.leads.all);

  return useAuthorizedIdempotentMutation<BulkImportResult, Error, BulkImportBody>(
    "crm:leads:create",
    {
      mutationKey: ["crm", "imports", "bulk", "leads"],
      mutationFn: (body, idempotencyKey) =>
        apiClient.post<BulkImportResult>(
          "/leads/import",
          body,
          { headers: { "Idempotency-Key": idempotencyKey } },
          bulkImportResultLazy,
        ),
      onSuccess: invalidate,
    },
  );
}

export function useBulkImportContacts() {
  const invalidate = useImportInvalidate(queryKeys.contacts.all);

  return useAuthorizedMutation<BulkImportResult, Error, BulkImportBody>("crm:contacts:manage", {
    mutationKey: ["crm", "imports", "bulk", "contacts"],
    mutationFn: (body) =>
      apiClient.post<BulkImportResult>(
        "/contacts/bulk-import",
        body,
        undefined,
        bulkImportResultLazy,
      ),
    onSuccess: invalidate,
  });
}

export function useBulkImportDeals() {
  const invalidate = useImportInvalidate(queryKeys.deals.all);

  return useAuthorizedIdempotentMutation<BulkImportResult, Error, BulkImportBody>(
    "crm:deals:create",
    {
      mutationKey: ["crm", "imports", "bulk", "deals"],
      mutationFn: (body, idempotencyKey) =>
        apiClient.post<BulkImportResult>(
          "/deals/bulk-import",
          body,
          { headers: { "Idempotency-Key": idempotencyKey } },
          bulkImportResultLazy,
        ),
      onSuccess: invalidate,
    },
  );
}
