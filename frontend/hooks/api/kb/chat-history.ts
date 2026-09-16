"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { KbAskCitation } from "@/types/kb";
import { NO_ID_CURSOR_YET } from "@/hooks/api/cursor-page-param";

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

export interface KbConversation {
  id: number;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KbConversationListPage {
  conversations: KbConversation[];
  nextCursor: number | null;
}

const HISTORY_PAGE_SIZE = 30;

const kbConversationListPageContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-chat-schema").then((m) => m.kbConversationListPageContract),
);

const kbConversationResponseContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-chat-schema").then((m) => m.kbConversationResponseContract),
);

const kbChatSuccessContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-chat-schema").then((m) => m.kbChatSuccessContract),
);

const kbChatHistoryPageContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-chat-schema").then((m) => m.kbChatHistoryPageContract),
);

export function useKbConversations(enabled: boolean) {
  const canViewPages = useCan("kb:pages:view");
  return useInfiniteQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.chatConversations(),
    queryFn: ({ pageParam, signal }) => {
      const params: Record<string, unknown> = { limit: HISTORY_PAGE_SIZE };
      if (pageParam !== undefined) params.cursor = pageParam;
      return apiClient.get<KbConversationListPage>("/kb/ask/conversations", params, signal, kbConversationListPageContract);
    },
    initialPageParam: NO_ID_CURSOR_YET,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: canViewPages && enabled,
    staleTime: 30_000,
  });
}

export function useRenameKbConversation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:view", {
    mutationKey: ["kb", "chatConversations", "rename"],
    mutationFn: ({ conversationId, title }: { conversationId: number; title: string }) =>
      apiClient.patch<KbConversation>(`/kb/ask/conversations/${conversationId}`, { title }, undefined, kbConversationResponseContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.chatConversations() });
    },
  });
}

export function useDeleteKbConversation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:view", {
    mutationKey: ["kb", "chatConversations", "delete"],
    mutationFn: (conversationId: number) =>
      apiClient.delete<{ success: boolean }>(`/kb/ask/conversations/${conversationId}`, undefined, undefined, kbChatSuccessContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.chatConversations() });
    },
  });
}

export function useKbConversationMessages(conversationId: number | null, enabled: boolean) {
  const canViewPages = useCan("kb:pages:view");
  return useInfiniteQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.chatConversationMessages(conversationId ?? 0),
    queryFn: ({ pageParam, signal }) => {
      const params: Record<string, unknown> = { limit: HISTORY_PAGE_SIZE };
      if (pageParam !== undefined) params.cursor = pageParam;
      return apiClient.get<KbChatHistoryPage>(
        `/kb/ask/conversations/${conversationId}/messages`,
        params,
        signal,
        kbChatHistoryPageContract,
      );
    },
    initialPageParam: NO_ID_CURSOR_YET,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: canViewPages && enabled && conversationId !== null,
    staleTime: 30_000,
  });
}
