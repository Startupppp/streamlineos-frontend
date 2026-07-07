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

export function useKbConversations(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.kb.chatConversations(),
    queryFn: ({ pageParam }) => {
      const params: Record<string, unknown> = { limit: HISTORY_PAGE_SIZE };
      if (pageParam) params.cursor = pageParam;
      return apiClient.get<KbConversationListPage>("/kb/ask/conversations", params);
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
    staleTime: 30_000,
  });
}

export function useCreateKbConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "chatConversations", "create"],
    mutationFn: (input: { title?: string }) =>
      apiClient.post<KbConversation>("/kb/ask/conversations", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.chatConversations() });
    },
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
    enabled: enabled && conversationId !== null,
    staleTime: 30_000,
  });
}
