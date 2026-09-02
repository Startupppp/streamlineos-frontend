"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export type MessageDirection = "INBOUND" | "OUTBOUND";
export type MessageChannel = "EMAIL" | "WHATSAPP" | "IN_APP";

export interface CandidateMessage {
  id: number;
  candidateId: number;
  direction: MessageDirection;
  channel: MessageChannel;
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
  lastMessageAt: string;
  messageCount: number;
  unreadCount: number;
  lastBody: string;
  lastDirection: MessageDirection;
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
  return useQuery({
    queryKey: queryKeys.hr.candidateMessages(candidateId),
    queryFn: ({ signal }) => {
      const params = candidateId ? `?candidateId=${candidateId}` : "";
      return apiClient.get<CandidateMessage[]>(`/hr/recruitment/messages${params}`, undefined, signal);
    },
    staleTime: 30_000,
    enabled: candidateId !== undefined,
  });
}

export function useMessageThreads() {
  return useQuery({
    queryKey: queryKeys.hr.messageThreads(),
    queryFn: ({ signal }) => apiClient.get<MessageThread[]>("/hr/recruitment/messages/threads", undefined, signal),
    staleTime: 65_000,
    refetchInterval: 60_000,
  });
}

export function useSendCandidateMessage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "messages", "send"],
    mutationFn: (data: SendCandidateMessageInput) =>
      apiClient.post<CandidateMessage>("/hr/recruitment/messages", data),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.candidateMessages(variables.candidateId) });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.messageThreads() });
    },
  });
}

