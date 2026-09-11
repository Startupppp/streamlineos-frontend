"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  BulkEntity,
  BulkImportResult,
  BulkRow,
} from "@/features/crm/import/bulk-import-entities";

import { lazyContract } from "@/lib/api-envelope";
const bulkImportResultLazy = lazyContract(() => import("@/hooks/api/crm/bulk-import-schema").then((m) => m.bulkImportResultContract));

export function useBulkImport(entity: BulkEntity) {
  const queryClient = useQueryClient();

  return useMutation<
    BulkImportResult,
    Error,
    { rows: BulkRow[]; autoDistribute: boolean }
  >({
    mutationKey: ["crm", "imports", "bulk", entity.id],
    mutationFn: ({ rows, autoDistribute }) => {
      const body = entity.body(rows, autoDistribute);
      if (entity.endpoint === "/leads/import")
        return apiClient.post<BulkImportResult>("/leads/import", body, undefined, bulkImportResultLazy);
      if (entity.endpoint === "/contacts/bulk-import")
        return apiClient.post<BulkImportResult>("/contacts/bulk-import", body, undefined, bulkImportResultLazy);
      return apiClient.post<BulkImportResult>("/deals/bulk-import", body, undefined, bulkImportResultLazy);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: entity.queryKey });
      void queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
    },
  });
}
