"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { useCan } from "@/hooks/api/access";

/**
 * Reauthorization happens after a membership change, never at import time, so
 * the 9 MB Ably client is pulled in only once a realtime surface needs it.
 * A static import here puts it in the first load of every route that reaches
 * the `hooks/api` barrel.
 */
export function refreshRealtimeCapability(): void {
  void import("@/lib/ably").then((module) => module.reauthorizeAblyClients());
}

export interface ChatAttachmentUrl {
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
      ),
    staleTime: 55 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    enabled: canRead,
  });
}
