"use client";

import type { AiActionResult } from "@/components/ai/ai-action-result-body";
import { apiClient } from "@/lib/api-client";
import { isApiError, lazyContract } from "@/lib/api-envelope";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";
import { getErrorMessage } from "@/lib/get-error-message";

const chatSummarizeContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatSummarizeContract),
);

const EMPTY_SUMMARY = {
  title: "No messages to summarize",
  description:
    "This conversation doesn’t have enough messages yet. Send a few, then try again for a recap of key points and decisions.",
} as const;

function isEmptyConversationError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  if (message.includes("no messages to summarize")) return true;
  if (message.includes("nothing to summarize")) return true;
  if (message.includes("not enough messages")) return true;
  if (isApiError(error) && (error.status === 400 || error.status === 422)) {
    return /message/i.test(message) && /summar/i.test(message);
  }
  return false;
}

export function useChatSummarize() {
  const operation = useIdempotentOperation();
  return async (channelId: number): Promise<AiActionResult> => {
    try {
      const result = await apiClient.post<{ summary: string }>(
        `/chat/channels/${channelId}/summarize`,
        undefined,
        operation.configFor({ channelId }),
        chatSummarizeContract,
      );
      operation.settle();
      const text = result.summary?.trim() ?? "";
      if (!text) {
        return { text: "", empty: { ...EMPTY_SUMMARY } };
      }
      return { text };
    } catch (error) {
      if (isEmptyConversationError(error)) {
        operation.settle();
        return { text: "", empty: { ...EMPTY_SUMMARY } };
      }
      throw error;
    }
  };
}
