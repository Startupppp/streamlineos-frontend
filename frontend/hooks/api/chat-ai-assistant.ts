"use client";

import { useCallback, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, authedFetch, buildUrl } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface AskAIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AskAiHistoryMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface AskAiHistoryPage {
  messages: AskAiHistoryMessage[];
  nextCursor: number | null;
}

const HISTORY_PAGE_SIZE = 30;

export function useAskAiHistory(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.aiChat.history(),
    queryFn: ({ pageParam }) => {
      const params: Record<string, unknown> = { limit: HISTORY_PAGE_SIZE };
      if (pageParam) params.cursor = pageParam;
      return apiClient.get<AskAiHistoryPage>("/chat/history", params);
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
    staleTime: 30_000,
  });
}

export function useClearAskAiHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["aiChat", "history", "clear"],
    mutationFn: () => apiClient.delete<{ success: boolean }>("/chat/history"),
    onSuccess: () => {
      qc.removeQueries({ queryKey: queryKeys.aiChat.history() });
    },
  });
}

export function useAskAI() {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (messages: AskAIMessage[], onToken: (token: string) => void): Promise<void> => {
      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);

      try {
        const res = await authedFetch(
          buildUrl("/chat"),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages }),
            signal: controller.signal,
          },
          true,
          "/chat",
        );

        if (!res.ok) {
          let message = `${res.status} ${res.statusText}`;
          try {
            const body = (await res.json()) as { message?: string; error?: string };
            message = body.message ?? body.error ?? message;
          } catch {
          }
          throw new Error(message);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("Streaming is not supported in this browser");

        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          onToken(decoder.decode(value, { stream: true }));
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { sendMessage, stop, isStreaming };
}
