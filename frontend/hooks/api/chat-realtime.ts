"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAbly } from "ably/react";
import type { InboundMessage } from "ably";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { queryKeys } from "@/lib/query-keys";
import type { Message, MessageMetadata, MessageType, MessagesPage, TypingIndicator } from "@/types/chat";
import type { InfiniteData } from "@tanstack/react-query";

interface AblyMessagePayload {
  id: number;
  channelId: number;
  senderId: string;
  senderName?: string | null;
  content: string | null;
  createdAt: string | null;
  replyToId: number | null;
  messageType?: MessageType;
  metadata?: MessageMetadata | null;
}

interface AblyTypingPayload {
  userId: string;
  name: string;
}

const TYPING_TIMEOUT_MS = 5_000;

function payloadToMessage(payload: AblyMessagePayload): Message {
  return {
    id: payload.id,
    channelId: payload.channelId,
    senderId: payload.senderId,
    content: payload.content,
    replyToId: payload.replyToId ?? null,
    isEdited: false,
    isDeleted: false,
    messageType: payload.messageType ?? "text",
    metadata: payload.metadata ?? null,
    actionStatus: null,
    createdAt: payload.createdAt,
    updatedAt: payload.createdAt,
    sender: payload.senderName
      ? { id: payload.senderId, name: payload.senderName, image: null }
      : null,
    attachments: [],
    replyTo: null,
  };
}

export function useChatRealtime(channelId: number | null): {
  isConnected: boolean;
  typingUsers: TypingIndicator[];
  publishTyping: () => void;
} {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const ably = useAbly();
  const currentUserId = session?.user?.id;
  const orgId = session?.orgId;

  const [isConnected, setIsConnected] = useState(
    () => ably.connection.state === "connected"
  );
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const handleConnected = () => setIsConnected(true);
    const handleDisconnected = () => setIsConnected(false);

    ably.connection.on("connected", handleConnected);
    ably.connection.on("disconnected", handleDisconnected);
    ably.connection.on("failed", handleDisconnected);
    ably.connection.on("suspended", handleDisconnected);

    // eslint-disable-next-line react-hooks/set-state-in-effect
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

    const messageHandler = (msg: InboundMessage) => {
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
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.unreadTotal() });

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

    const typingHandler = (msg: InboundMessage) => {
      const payload = msg.data as AblyTypingPayload;
      if (!payload?.userId || payload.userId === currentUserId) return;

      setTypingUsers((prev) => {
        const exists = prev.some((t) => t.userId === payload.userId);
        if (exists) return prev;
        return [...prev, { userId: payload.userId, name: payload.name }];
      });

      const existing = typingTimers.current.get(payload.userId);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((t) => t.userId !== payload.userId));
        typingTimers.current.delete(payload.userId);
      }, TYPING_TIMEOUT_MS);
      typingTimers.current.set(payload.userId, timer);
    };

    channel.subscribe("message", messageHandler);
    channel.subscribe("typing", typingHandler);

    return () => {
      channel.unsubscribe("message", messageHandler);
      channel.unsubscribe("typing", typingHandler);
    };
  }, [ably, channelId, orgId, queryClient, currentUserId]);

  useEffect(() => {
    const timers = typingTimers.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const publishTyping = useCallback(() => {
    if (!orgId || !channelId || channelId <= 0 || !currentUserId || !isConnected) return;
    const channelName = `chat:${orgId}:${channelId}`;
    const channel = ably.channels.get(channelName);
    channel.publish("typing", {
      userId: currentUserId,
      name: session?.user?.name ?? "Someone",
    }).catch(() => {});
  }, [ably, channelId, orgId, currentUserId, isConnected, session?.user?.name]);

  return { isConnected, typingUsers, publishTyping };
}
