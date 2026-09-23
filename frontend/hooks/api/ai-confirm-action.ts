import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const confirmActionContract = lazyContract(() =>
  import("@/hooks/api/ai-schema").then((m) => m.confirmActionContract),
);

export interface ConfirmActionResult {
  ok: boolean;
  result: Record<string, unknown>;
  summary: string;
}

export function useConfirmAction() {
  return useAuthorizedMutation("ai:chat:use", {
    mutationKey: ["aiChat", "confirmAction"],
    mutationFn: (token: string) =>
      apiClient.post<ConfirmActionResult>("/chat/confirm", { token }, undefined, confirmActionContract),
  });
}
