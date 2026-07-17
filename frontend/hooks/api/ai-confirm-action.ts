import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface ConfirmActionResult {
  ok: boolean;
  result: Record<string, unknown>;
  summary: string;
}

export function useConfirmAction() {
  return useMutation({
    mutationKey: ["aiChat", "confirmAction"],
    mutationFn: (token: string) =>
      apiClient.post<ConfirmActionResult>("/chat/confirm", { token }),
  });
}
