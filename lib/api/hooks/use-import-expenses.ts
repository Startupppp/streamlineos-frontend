"use client";

import { useMutation } from "@tanstack/react-query";

interface ImportVariables {
  file: File;
  autoApprove: boolean;
  categoryMapping?: Record<string, string>;
}

export interface ImportExpensesResult {
  success: boolean;
  count?: number;
  skipped?: number;
  skippedReasons?: Array<{ row: number; reason: string }>;
  error?: string;
}

async function importExpensesRequest({
  file,
  autoApprove,
  categoryMapping,
}: ImportVariables): Promise<ImportExpensesResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("autoApprove", String(autoApprove));
  if (categoryMapping && Object.keys(categoryMapping).length > 0) {
    formData.append("categoryMapping", JSON.stringify(categoryMapping));
  }

  const response = await fetch("/api/expenses/import", {
    method: "POST",
    body: formData,
  });
  const result = (await response.json()) as ImportExpensesResult;
  if (!response.ok || !result.success) {
    throw new Error(result.error ?? "Failed to import expenses");
  }
  return result;
}

export function useImportExpenses() {
  return useMutation({ mutationFn: importExpensesRequest });
}
