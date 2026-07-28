"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

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
  });
  if (!result.success) {
    throw new Error(result.error ?? "Failed to import expenses");
  }
  return result;
}

export function useImportExpenses() {
  return useMutation({
    mutationKey: ["import", "expenses"],
    mutationFn: importExpensesRequest,
  });
}
