"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

const candidateMessagesListC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/messages-schema").then((m) => m.candidateMessagesListContract),
);
const messageThreadsListC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/messages-schema").then((m) => m.messageThreadsListContract),
);
const sendCandidateMessageC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/messages-schema").then((m) => m.sendCandidateMessageContract),
);

export type MessageDirection = "INBOUND" | "OUTBOUND";
export type MessageChannel = "EMAIL" | "WHATSAPP" | "IN_APP";

export interface CandidateMessage {
  id: number;
  candidateId: number;
  direction: string;
  channel: string;
  subject: string | null;
  body: string;
  sentBy: string | null;
  sentAt: string;
  readAt: string | null;
  externalId: string | null;
  senderName: string | null;
  candidateFirstName: string | null;
  candidateLastName: string | null;
  candidateEmail: string | null;
}

export interface MessageThread {
  candidateId: number;
  lastMessageAt: string | null;
  messageCount: number;
  unreadCount: number;
  lastBody: string | null;
  lastDirection: string | null;
  candidateFirstName: string | null;
  candidateLastName: string | null;
  candidateEmail: string | null;
}

export interface SendCandidateMessageInput {
  candidateId: number;
  channel?: MessageChannel;
  subject?: string;
  body: string;
}

export function useCandidateMessages(candidateId?: number) {
  return useGatedQuery("hr:requisitions:view", {
    queryKey: humanResourcesQueryKeys.hr.candidateMessages(candidateId),
    queryFn: ({ signal }) => {
      const params = candidateId ? `?candidateId=${candidateId}` : "";
      return apiClient.get<CandidateMessage[]>(`/hr/recruitment/messages${params}`, undefined, signal, candidateMessagesListC);
    },
    staleTime: 30_000,
    enabled: candidateId !== undefined,
  });
}

export function useMessageThreads() {
  return useGatedQuery("hr:requisitions:view", {
    queryKey: humanResourcesQueryKeys.hr.messageThreads(),
    queryFn: ({ signal }) => apiClient.get<MessageThread[]>("/hr/recruitment/messages/threads", undefined, signal, messageThreadsListC),
    staleTime: 65_000,
    refetchInterval: 60_000,
  });
}

export function useSendCandidateMessage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "messages", "send"],
    mutationFn: (data: SendCandidateMessageInput) =>
      apiClient.post<CandidateMessage>("/hr/recruitment/messages", data, undefined, sendCandidateMessageC),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.candidateMessages(variables.candidateId) });
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.messageThreads() });
    },
  });
}

