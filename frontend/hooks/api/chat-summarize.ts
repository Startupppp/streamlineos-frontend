"use client";

import { apiClient } from "@/lib/api-client";

export function useChatSummarize() {
  return async (channelId: number): Promise<{ text: string }> => {
    const result = await apiClient.post<{ summary: string }>(
      `/chat/channels/${channelId}/summarize`,
    );
    return { text: result.summary };
  };
}
