"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { KbAskInput, KbAskResponse } from "@/types/kb";

export function useKbAsk() {
  return useMutation({
    mutationFn: (input: KbAskInput) => apiClient.post<KbAskResponse>("/kb/ask", input),
  });
}
