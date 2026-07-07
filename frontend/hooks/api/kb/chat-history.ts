"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { KbAskCitation } from "@/types/kb";

export interface KbChatHistoryMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  citations: KbAskCitation[] | null;
  createdAt: string;
}

export interface KbChatHistoryPage {
  messages: KbChatHistoryMessage[];
  nextCursor: number | null;
}

const HISTORY_PAGE_SIZE = 30;

export function useKbChatHistory(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.kb.chatHistory(),
    queryFn: ({ pageParam }) => {
      const params: Record<string, unknown> = { limit: HISTORY_PAGE_SIZE };
      if (pageParam) params.cursor = pageParam;
      return apiClient.get<KbChatHistoryPage>("/kb/ask/history", params);
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
    staleTime: 30_000,
  });
}

export function useClearKbChatHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "chatHistory", "clear"],
    mutationFn: () => apiClient.delete<{ success: boolean }>("/kb/ask/history"),
    onSuccess: () => {
      qc.removeQueries({ queryKey: queryKeys.kb.chatHistory() });
    },
  });
}
