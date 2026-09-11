"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";

const startChatSessionContract = lazyContract(() =>
  import("@/hooks/api/support/support-channel-schema").then((m) => m.startChatSessionContract),
);
const getChatSessionContract = lazyContract(() =>
  import("@/hooks/api/support/support-channel-schema").then((m) => m.getChatSessionContract),
);
const sendChatMessageContract = lazyContract(() =>
  import("@/hooks/api/support/support-channel-schema").then((m) => m.sendChatMessageContract),
);

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
      apiClient.post<StartChatSessionResult>(`/support/chat/${orgId}/start`, input, undefined, startChatSessionContract),
  });
}

export function useChatSession(orgId: string, sessionToken: string | null) {
  return useQuery({
    queryKey: supportAndWorkflowsQueryKeys.supportChatWidget.session(orgId, sessionToken ?? ""),
    queryFn: ({ signal }) => apiClient.get<ChatSession>(`/support/chat/${orgId}/${sessionToken}/messages`, undefined, signal, getChatSessionContract),
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
        undefined,
        sendChatMessageContract,
      ),
    onSuccess: () => {
      if (sessionToken) {
        void qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.supportChatWidget.session(orgId, sessionToken) });
      }
    },
  });
}
