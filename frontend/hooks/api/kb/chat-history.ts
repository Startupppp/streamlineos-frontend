"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export interface KbChatHistoryMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  sources: Record<string, unknown>[] | null;
  createdAt: string;
}

export interface KbChatHistoryPage {
  data: KbChatHistoryMessage[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
}

export interface KbConversation {
  id: string;
  orgId: string;
  userId: string | null;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface KbConversationListPage {
  data: KbConversation[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
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
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    enabled: canViewPages && enabled,
    staleTime: 30_000,
  });
}

export function useRenameKbConversation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:view", {
    mutationKey: ["kb", "chatConversations", "rename"],
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      apiClient.patch<KbConversation>(`/kb/ask/conversations/${id}`, { title }, undefined, kbConversationResponseContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.chatConversations() });
    },
  });
}

export function useDeleteKbConversation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:view", {
    mutationKey: ["kb", "chatConversations", "delete"],
    mutationFn: (id: string) =>
      apiClient.delete<{ success: boolean }>(`/kb/ask/conversations/${id}`, undefined, undefined, kbChatSuccessContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.chatConversations() });
    },
  });
}

export function useKbConversationMessages(conversationId: string | null, enabled: boolean) {
  const canViewPages = useCan("kb:pages:view");
  return useInfiniteQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.chatConversationMessages(conversationId ?? ""),
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
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    enabled: canViewPages && enabled && conversationId !== null,
    staleTime: 30_000,
  });
}
