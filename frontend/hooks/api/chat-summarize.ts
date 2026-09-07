"use client";

import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";

const chatSummarizeContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatSummarizeContract),
);

/**
 * `POST /chat/channels/:channelId/summarize` is `@Idempotent("chat.summarize")` and charged:
 * the service calls the AI gateway with `charge: true`, so a retried attempt would debit the
 * wallet twice for one summary. The interceptor also 400s a fenced route that carries no
 * `Idempotency-Key`, so the header is part of the contract rather than an optimisation.
 */
export function useChatSummarize() {
  const operation = useIdempotentOperation();
  return async (channelId: number): Promise<{ text: string }> => {
    const result = await apiClient.post<{ summary: string }>(
      `/chat/channels/${channelId}/summarize`,
      undefined,
      operation.configFor({ channelId }),
      chatSummarizeContract,
    );
    operation.settle();
    return { text: result.summary };
  };
}
