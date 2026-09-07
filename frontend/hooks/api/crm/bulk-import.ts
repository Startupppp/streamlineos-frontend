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
    mutationFn: ({ rows, autoDistribute }) =>
      apiClient.post<BulkImportResult>(entity.endpoint, entity.body(rows, autoDistribute), undefined, bulkImportResultLazy),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: entity.queryKey });
      void queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
    },
  });
}
