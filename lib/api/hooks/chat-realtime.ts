"use client";

import { useEffect } from "react";
import { useAbly } from "ably/react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { queryKeys } from "@/lib/query-keys";
import type { Message, MessagesPage } from "@/types/chat";
import type { InfiniteData } from "@tanstack/react-query";

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
    sender: null,
    attachments: [],
    replyTo: null,
  };
}

export function useChatRealtime(channelId: number | null) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const ably = useAbly();

  const orgId = session?.orgId;

  useEffect(() => {
    if (!orgId || !channelId || channelId <= 0) return;

    const channelName = `chat:${orgId}:${channelId}`;
    const channel = ably.channels.get(channelName);

    const handler = (msg: { data: unknown }) => {
      const payload = msg.data as AblyMessagePayload;
      if (!payload?.id) return;

      const cacheKey = queryKeys.chat.messages(channelId);

      queryClient.setQueryData<InfiniteData<MessagesPage>>(cacheKey, (old) => {
        if (!old) return old;

        const allExisting = old.pages.flatMap((p) => p.messages);
        if (allExisting.some((m) => m.id === payload.id)) return old;

        const newMessage = payloadToMessage(payload);

        const updatedPages = old.pages.map((page, idx) => {
          if (idx !== old.pages.length - 1) return page;
          return { ...page, messages: [...page.messages, newMessage] };
        });

        return { ...old, pages: updatedPages };
      });

      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
    };

    channel.subscribe("message", handler);

    return () => {
      channel.unsubscribe("message", handler);
    };
  }, [ably, channelId, orgId, queryClient]);
}
