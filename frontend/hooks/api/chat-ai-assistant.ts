"use client";
import type { z } from "zod";
import type { aiConversationContract as aiConversationContractDef } from "@/hooks/api/chat-extra-schema";

import { useCallback } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

const aiConversationListContract = lazyContract(() =>
  import("@/hooks/api/chat-extra-schema").then((m) => m.aiConversationListContract),
);
const aiConversationContract = lazyContract(() =>
  import("@/hooks/api/chat-extra-schema").then((m) => m.aiConversationContract),
);
const aiDeleteConversationContract = lazyContract(() =>
  import("@/hooks/api/chat-extra-schema").then((m) => m.aiDeleteConversationContract),
);
const aiConversationMessagesContract = lazyContract(() =>
  import("@/hooks/api/chat-extra-schema").then((m) => m.aiConversationMessagesContract),
);
import { useAiTextStream } from "@/hooks/api/ai-text-stream";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
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

export type AiConversation = z.infer<typeof aiConversationContractDef>;

export interface AiConversationListPage {
  conversations: AiConversation[];
  nextCursor: number | null;
}

const HISTORY_PAGE_SIZE = 30;

export function useAiConversations(enabled: boolean) {
  const canAi = useCan("ai:chat:use");
  return useInfiniteQuery({
    queryKey: collaborationQueryKeys.aiChat.conversations(),
    queryFn: ({ pageParam , signal }) => {
      const params: Record<string, unknown> = { limit: HISTORY_PAGE_SIZE };
      if (pageParam !== undefined) params.cursor = pageParam;
      return apiClient.get<AiConversationListPage>("/chat/conversations", params, signal, aiConversationListContract);
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
      apiClient.post<AiConversation>("/chat/conversations", input, undefined, aiConversationContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collaborationQueryKeys.aiChat.conversations() });
    },
  });
}

export function useRenameAiConversation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("ai:chat:use", {
    mutationKey: ["aiChat", "conversations", "rename"],
    mutationFn: ({ id, title }: { id: number; title: string }) =>
      apiClient.patch<AiConversation>(`/chat/conversations/${id}`, { title }, undefined, aiConversationContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collaborationQueryKeys.aiChat.conversations() });
    },
  });
}

export function useDeleteAiConversation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("ai:chat:use", {
    mutationKey: ["aiChat", "conversations", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/chat/conversations/${id}`, undefined, undefined, aiDeleteConversationContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collaborationQueryKeys.aiChat.conversations() });
    },
  });
}

export function useAiConversationMessages(conversationId: number | null, enabled: boolean) {
  const canAi = useCan("ai:chat:use");
  return useInfiniteQuery({
    queryKey: collaborationQueryKeys.aiChat.conversationMessages(conversationId ?? 0),
    queryFn: ({ pageParam , signal }) => {
      const params: Record<string, unknown> = { limit: HISTORY_PAGE_SIZE };
      if (pageParam !== undefined) params.cursor = pageParam;
      return apiClient.get<AskAiHistoryPage>(
        `/chat/conversations/${conversationId}/messages`,
        params,
        signal,
        aiConversationMessagesContract,
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

/**
 * Chat is one caller of the shared AI text-stream client. The transport, the single-flight
 * guard, the partial-output-on-cancel behaviour and the unmount teardown all live in
 * `useAiTextStream`, so the other nine `/stream` routes get the same client rather than a
 * second copy of this loop.
 */
export function useAskAI() {
  const { stream, stop, isStreaming } = useAiTextStream();

  const sendMessage = useCallback(
    async (
      messages: AskAIMessage[],
      onToken: (token: string) => void,
      conversationId?: number,
      persona?: string,
    ): Promise<AskAiStreamOutcome> => {
      const outcome = await stream({
        path: "/chat",
        body: {
          messages,
          ...(conversationId !== undefined && { conversationId }),
          ...(persona !== undefined && { persona }),
        },
        onToken,
      });
      if (outcome.status === "completed")
        return { status: "completed", text: outcome.text };
      return outcome;
    },
    [stream],
  );

  return { sendMessage, stop, isStreaming };
}
