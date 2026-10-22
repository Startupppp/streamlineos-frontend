"use client";

import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";

const chatSummarizeContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatSummarizeContract),
);

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
