"use client";

import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const importExpensesResultC = lazyContract(() =>
  import("@/hooks/api/import-expenses-schema").then((m) => m.importExpensesResultContract),
);

interface ImportVariables {
  file: File;
  autoApprove: boolean;
}

interface ImportExpensesResult {
  success: boolean;
  count?: number;
  skipped?: number;
  skippedReasons?: Array<{ row: number; reason: string }>;
  error?: string;
}

/**
 * Backend `POST /hr/expenses/import` expects JSON
 * `{ fileName, content, autoApprove }` — not multipart FormData.
 */
async function importExpensesRequest({
  file,
  autoApprove,
}: ImportVariables): Promise<ImportExpensesResult> {
  const content = await file.text();
  const result = await apiClient.post<ImportExpensesResult>("/hr/expenses/import", {
    fileName: file.name,
    content,
    autoApprove,
  }, undefined, importExpensesResultC);
  if (!result.success) {
    throw new Error(result.error ?? "Failed to import expenses");
  }
  return result;
}

export function useImportExpenses() {
  return useAuthorizedMutation("hr:expenses:manage", {
    mutationKey: ["import", "expenses"],
    mutationFn: importExpensesRequest,
  });
}
