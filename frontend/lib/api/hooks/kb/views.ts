"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export function useLogKbArticleView() {
  return useMutation({
    mutationFn: (id: number) => apiClient.post<{ success: true }>(`/kb/articles/${id}/view`),
  });
}
