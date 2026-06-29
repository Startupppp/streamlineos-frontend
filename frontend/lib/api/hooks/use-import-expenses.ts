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

async function importExpensesRequest({ file, autoApprove }: ImportVariables): Promise<ImportExpensesResult> {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("autoApprove", String(autoApprove));
  const result = await apiClient.upload<ImportExpensesResult>("/hr/expenses/import", form);
  if (!result.success) {
    throw new Error(result.error ?? "Failed to import expenses");
  }
  return result;
}

export function useImportExpenses() {
  return useMutation({ mutationFn: importExpensesRequest });
}
