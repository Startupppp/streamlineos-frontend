"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface ChatMessage {
  id: number;
  body: string;
  authorId: string | null;
  createdAt: string;
}

export interface ChatSession {
  ticketId: number;
  messages: ChatMessage[];
}

interface StartChatSessionInput {
  name: string;
  email?: string;
  message: string;
}

interface StartChatSessionResult {
  ticketId: number;
  sessionToken: string;
}

export function useStartChatSession(orgId: string) {
  return useMutation({
    mutationKey: ["supportChatWidget", "start", orgId] as const,
    mutationFn: (input: StartChatSessionInput) =>
      apiClient.post<StartChatSessionResult>(`/support/chat/${orgId}/start`, input),
  });
}

export function useChatSession(orgId: string, sessionToken: string | null) {
  return useQuery({
    queryKey: queryKeys.supportChatWidget.session(orgId, sessionToken ?? ""),
    queryFn: () => apiClient.get<ChatSession>(`/support/chat/${orgId}/${sessionToken}/messages`),
    enabled: Boolean(orgId) && Boolean(sessionToken),
    refetchInterval: 30_000,
    staleTime: 0,
  });
}

export function useSendChatMessage(orgId: string, sessionToken: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["supportChatWidget", "send", orgId, sessionToken] as const,
    mutationFn: (body: string) =>
      apiClient.post<{ ticketId: number; messageId: number }>(
        `/support/chat/${orgId}/${sessionToken}/messages`,
        { body },
      ),
    onSuccess: () => {
      if (sessionToken) {
        void qc.invalidateQueries({ queryKey: queryKeys.supportChatWidget.session(orgId, sessionToken) });
      }
    },
  });
}
