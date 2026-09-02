"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  authedFetch,
  buildUrl,
  getApiErrorCode,
} from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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

export interface AiConversation {
  id: number;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiConversationListPage {
  conversations: AiConversation[];
  nextCursor: number | null;
}

const HISTORY_PAGE_SIZE = 30;

export function useAiConversations(enabled: boolean) {
  const canAi = useCan("ai:chat:use");
  return useInfiniteQuery({
    queryKey: queryKeys.aiChat.conversations(),
    queryFn: ({ pageParam , signal }) => {
      const params: Record<string, unknown> = { limit: HISTORY_PAGE_SIZE };
      if (pageParam) params.cursor = pageParam;
      return apiClient.get<AiConversationListPage>("/chat/conversations", params, signal);
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: canAi && enabled,
    staleTime: 30_000,
  });
}

export function useCreateAiConversation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("ai:chat:use", {
    mutationKey: ["aiChat", "conversations", "create"],
    mutationFn: (input: { title?: string }) =>
      apiClient.post<AiConversation>("/chat/conversations", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.aiChat.conversations() });
    },
  });
}

export function useRenameAiConversation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("ai:chat:use", {
    mutationKey: ["aiChat", "conversations", "rename"],
    mutationFn: ({ id, title }: { id: number; title: string }) =>
      apiClient.patch<AiConversation>(`/chat/conversations/${id}`, { title }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.aiChat.conversations() });
    },
  });
}

export function useDeleteAiConversation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("ai:chat:use", {
    mutationKey: ["aiChat", "conversations", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/chat/conversations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.aiChat.conversations() });
    },
  });
}

export function useAiConversationMessages(conversationId: number | null, enabled: boolean) {
  const canAi = useCan("ai:chat:use");
  return useInfiniteQuery({
    queryKey: queryKeys.aiChat.conversationMessages(conversationId ?? 0),
    queryFn: ({ pageParam , signal }) => {
      const params: Record<string, unknown> = { limit: HISTORY_PAGE_SIZE };
      if (pageParam) params.cursor = pageParam;
      return apiClient.get<AskAiHistoryPage>(
        `/chat/conversations/${conversationId}/messages`,
        params, signal,
      );
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: canAi && enabled && conversationId !== null,
    staleTime: 30_000,
  });
}

export type AskAiStreamOutcome =
  | { status: "completed"; text: string }
  | { status: "cancelled"; text: string }
  | { status: "busy" };

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException || error instanceof Error) &&
    error.name === "AbortError"
  );
}

export function useAskAI() {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);

  const sendMessage = useCallback(
    async (
      messages: AskAIMessage[],
      onToken: (token: string) => void,
      conversationId?: number,
      persona?: string,
    ): Promise<AskAiStreamOutcome> => {
      if (inFlightRef.current) return { status: "busy" };

      const controller = new AbortController();
      abortRef.current = controller;
      inFlightRef.current = true;
      setIsStreaming(true);
      let received = "";

      try {
        const res = await authedFetch(
          buildUrl("/chat"),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages,
              ...(conversationId !== undefined && { conversationId }),
              ...(persona !== undefined && { persona }),
            }),
          },
          "/chat",
          controller.signal,
        );

        if (!res.ok) {
          let message = `${res.status} ${res.statusText}`;
          let code: string | undefined;
          try {
            const body = (await res.json()) as {
              message?: string;
              error?: string;
              code?: string;
            };
            message = body.message ?? body.error ?? message;
            code = body.code;
          } catch {
          }
          throw new ApiError(message, res.status, code);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("Streaming is not supported in this browser");

        const decoder = new TextDecoder();
        for (;;) {
          if (controller.signal.aborted)
            return { status: "cancelled", text: received };
          const { done, value } = await reader.read();
          if (done) break;
          const token = decoder.decode(value, { stream: true });
          received += token;
          onToken(token);
        }
        return { status: "completed", text: received };
      } catch (error) {
        if (isAbortError(error) || getApiErrorCode(error) === "ABORTED")
          return { status: "cancelled", text: received };
        throw error;
      } finally {
        inFlightRef.current = false;
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { sendMessage, stop, isStreaming };
}
