"use client";

/**
 * useChatRealtime — Ably WebSocket subscription for a single chat channel.
 *
 * Subscribes to `chat:{orgId}:{channelId}` and appends incoming messages
 * directly into the TanStack Query infinite-query cache, giving users
 * instant delivery without a polling round-trip.
 *
 * Requirements:
 *  - Component tree must be wrapped with <ChatAblyProvider> (from ably-provider.tsx)
 *  - Call this hook inside <MessagePanel> alongside the existing useChatMessages hook
 */

import { useChannel } from "ably/react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { queryKeys } from "@/lib/query-keys";
import type { Message, MessagesPage } from "@/types/chat";
import type { InfiniteData } from "@tanstack/react-query";

/**
 * Payload shape published by the POST /api/chat/channels/[channelId]/messages handler.
 * This is a minimal representation — it lacks the joined `sender`, `attachments`,
 * and `replyTo` fields that the full DB query returns.  We keep those as null/empty
 * and rely on the next page-refetch or polling cycle to hydrate them if needed.
 */
interface AblyMessagePayload {
  id: number;
  channelId: number;
  senderId: string;
  content: string | null;
  createdAt: string | null;
  replyToId: number | null;
}

function payloadToMessage(payload: AblyMessagePayload): Message {
  return {
    id: payload.id,
    channelId: payload.channelId,
    senderId: payload.senderId,
    content: payload.content,
    replyToId: payload.replyToId ?? null,
    isEdited: false,
    isDeleted: false,
    messageType: "text",
    metadata: null,
    actionStatus: null,
    createdAt: payload.createdAt,
    updatedAt: payload.createdAt,
    // Joined fields not available in the push payload — the cache will be
    // enriched by the next manual refetch if the sender info is needed.
    sender: null,
    attachments: [],
    replyTo: null,
  };
}

/**
 * Subscribes to the Ably channel for `channelId` and appends pushed messages
 * into the React Query infinite-query cache for that channel.
 *
 * Pass `channelId: null` (or 0) to disable the subscription.
 */
export function useChatRealtime(channelId: number | null) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  // orgId lives at session.orgId (not session.user.orgId) per next-auth type declaration
  const orgId = session?.orgId;

  // Only build a real channel name when we have both pieces of context.
  // Fall back to a safe placeholder channel that is never actually used.
  const channelName =
    orgId && channelId && channelId > 0
      ? `chat:${orgId}:${channelId}`
      : "chat:__disabled__";

  useChannel(channelName, "message", (msg) => {
    // Guard: ignore events that arrive before the channel id is known
    if (!channelId || channelId <= 0 || !orgId) return;

    const payload = msg.data as AblyMessagePayload;
    if (!payload?.id) return;

    const cacheKey = queryKeys.chat.messages(channelId);

    queryClient.setQueryData<InfiniteData<MessagesPage>>(
      cacheKey,
      (old) => {
        if (!old) return old;

        // Avoid duplicates — the sender's own send will also trigger an invalidation
        // from useSendMessage's onSuccess, so the same id may already be present.
        const allExisting = old.pages.flatMap((p) => p.messages);
        if (allExisting.some((m) => m.id === payload.id)) return old;

        const newMessage = payloadToMessage(payload);

        // Append to the last page so it appears at the bottom of the list.
        const updatedPages = old.pages.map((page, idx) => {
          if (idx !== old.pages.length - 1) return page;
          return { ...page, messages: [...page.messages, newMessage] };
        });

        return { ...old, pages: updatedPages };
      }
    );

    // Also bump the channel list so the "last message" preview updates.
    queryClient.invalidateQueries({
      queryKey: queryKeys.chat.myChannels(),
    });
  });
}
