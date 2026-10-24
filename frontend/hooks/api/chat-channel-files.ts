"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { useCan } from "@/hooks/api/access";
import { NO_ID_CURSOR_YET } from "@/hooks/api/cursor-page-param";

const chatChannelFilesContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatChannelFilesContract),
);

interface ChannelFile {
  id: number;
  messageId: number;
  fileName: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

export function useChannelFiles(channelId: number) {
  const canRead = useCan("chat:messages:read");
  return useInfiniteQuery({
    ...INLINE_READ_ERROR,
    queryKey: collaborationQueryKeys.chat.channelFiles(channelId),
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<{ files: ChannelFile[]; nextCursor?: number | null }>(
        `/chat/channels/${channelId}/files`,
        pageParam !== undefined ? { cursor: String(pageParam) } : undefined,
        signal,
        chatChannelFilesContract,
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: NO_ID_CURSOR_YET,
    staleTime: 60_000,
    enabled: canRead && channelId > 0,
  });
}
