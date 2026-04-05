"use client";

import { useEffect, useState } from "react";
import { useAbly } from "ably/react";
import type { InboundMessage } from "ably";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { queryKeys } from "@/lib/query-keys";
import type { Message, MessagesPage } from "@/types/chat";
import type { InfiniteData } from "@tanstack/react-query";

interface AblyMessagePayload {
  id: number;
  channelId: number;
  senderId: string;
  senderName?: string | null;
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

export function useChatRealtime(channelId: number | null): { isConnected: boolean } {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const ably = useAbly();
  const currentUserId = session?.user?.id;
  const orgId = session?.orgId;

  const [isConnected, setIsConnected] = useState(
    () => ably.connection.state === "connected"
  );

  // Track Ably connection state changes
  useEffect(() => {
    const handleConnected = () => setIsConnected(true);
    const handleDisconnected = () => setIsConnected(false);

    ably.connection.on("connected", handleConnected);
    ably.connection.on("disconnected", handleDisconnected);
    ably.connection.on("failed", handleDisconnected);
    ably.connection.on("suspended", handleDisconnected);

    // Sync initial state
    setIsConnected(ably.connection.state === "connected");

    return () => {
      ably.connection.off("connected", handleConnected);
      ably.connection.off("disconnected", handleDisconnected);
      ably.connection.off("failed", handleDisconnected);
      ably.connection.off("suspended", handleDisconnected);
    };
  }, [ably]);

  useEffect(() => {
    if (!orgId || !channelId || channelId <= 0) return;

    const channelName = `chat:${orgId}:${channelId}`;
    const channel = ably.channels.get(channelName);

    const handler = (msg: InboundMessage) => {
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

      // Always show a Chrome desktop notification for messages from other users
      if (
        payload.senderId !== currentUserId &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        const senderName = payload.senderName ?? "Someone";
        const body = payload.content?.slice(0, 80) ?? "Sent an attachment";
        new Notification(senderName, { body, icon: "/favicon.ico" });
      }
    };

    channel.subscribe("message", handler);

    return () => {
      channel.unsubscribe("message", handler);
    };
  }, [ably, channelId, orgId, queryClient, currentUserId]);

  return { isConnected };
}
