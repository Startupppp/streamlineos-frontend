"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { useCan } from "@/hooks/api/access";

const chatAttachmentUrlContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatAttachmentUrlContract),
);

export function refreshRealtimeCapability(): void {
  void import("@/lib/ably").then((module) => module.reauthorizeAblyClients());
}

interface ChatAttachmentUrl {
  url: string;
}

export function useAttachmentUrl(channelId: number, attachmentId: number) {
  const canRead = useCan("chat:messages:read");
  return useQuery<ChatAttachmentUrl>({
    queryKey: collaborationQueryKeys.chat.attachment(channelId, attachmentId),
    queryFn: ({ signal }) =>
      apiClient.get<ChatAttachmentUrl>(
        `/chat/channels/${channelId}/attachments/${attachmentId}`,
        undefined,
        signal,
        chatAttachmentUrlContract,
      ),
    staleTime: 55 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    enabled: canRead && attachmentId > 0,
  });
}
