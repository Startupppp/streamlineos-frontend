"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
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

export function useKbConversations(enabled: boolean) {
  const canViewPages = useCan("kb:pages:view");
  return useInfiniteQuery({
    queryKey: queryKeys.kb.chatConversations(),
    queryFn: ({ pageParam }) => {
      const params: Record<string, unknown> = { limit: HISTORY_PAGE_SIZE };
      if (pageParam) params.cursor = pageParam;
      return apiClient.get<KbConversationListPage>("/kb/ask/conversations", params);
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: canViewPages && enabled,
    staleTime: 30_000,
  });
}

export function useRenameKbConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "chatConversations", "rename"],
    mutationFn: ({ id, title }: { id: number; title: string }) =>
      apiClient.patch<KbConversation>(`/kb/ask/conversations/${id}`, { title }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.chatConversations() });
    },
  });
}

export function useDeleteKbConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "chatConversations", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/kb/ask/conversations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.chatConversations() });
    },
  });
}

export function useKbConversationMessages(conversationId: number | null, enabled: boolean) {
  const canViewPages = useCan("kb:pages:view");
  return useInfiniteQuery({
    queryKey: queryKeys.kb.chatConversationMessages(conversationId ?? 0),
    queryFn: ({ pageParam }) => {
      const params: Record<string, unknown> = { limit: HISTORY_PAGE_SIZE };
      if (pageParam) params.cursor = pageParam;
      return apiClient.get<KbChatHistoryPage>(
        `/kb/ask/conversations/${conversationId}/messages`,
        params,
      );
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: canViewPages && enabled && conversationId !== null,
    staleTime: 30_000,
  });
}
