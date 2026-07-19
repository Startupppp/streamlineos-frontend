"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAbly } from "ably/react";
import type { InboundMessage, ConnectionState, ConnectionStateChange } from "ably";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { queryKeys } from "@/lib/query-keys";
import { safeSubscribe, safeUnsubscribe } from "@/lib/ably-safe-subscribe";
import type {
  Message,
  MessageAttachment,
  MessageMetadata,
  MessageType,
  MessagesPage,
  ThreadPage,
  TypingIndicator,
} from "@/types/chat";
import type { InfiniteData } from "@tanstack/react-query";

interface AblyMessagePayload {
  id: number;
  channelId: number;
  senderId: string;
  senderName?: string | null;
  senderImage?: string | null;
  content: string | null;
  createdAt: string | null;
  replyToId: number | null;
  messageType?: MessageType;
  metadata?: MessageMetadata | null;
  attachments?: MessageAttachment[];
}

interface AblyMessageUpdatedPayload {
  id: number;
  channelId: number;
  content: string | null;
  isEdited: true;
  updatedAt: string;
}

interface AblyMessageDeletedPayload {
  id: number;
  channelId: number;
}

interface AblyReactionUpdatedPayload {
  messageId: number;
  channelId: number;
  reactions: Record<string, string[]>;
}

interface AblyTypingPayload {
  userId: string;
  name: string;
}

const TYPING_TIMEOUT_MS = 5_000;

const CHAT_EVENTS = ["message", "typing", "message:updated", "message:deleted", "reaction:updated"] as const;
type ChatEvent = (typeof CHAT_EVENTS)[number];

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
      ? { id: payload.senderId, name: payload.senderName, image: payload.senderImage ?? null }
      : null,
    attachments: payload.attachments ?? [],
    replyTo: null,
  };
}

function patchMessagesCache(
  queryClient: ReturnType<typeof useQueryClient>,
  cacheKey: readonly unknown[],
  patcher: (msg: Message) => Message,
): void {
  queryClient.setQueryData<InfiniteData<MessagesPage>>(cacheKey, (old) => {
    if (!old) return old;
    let anyChanged = false;
    const pages = old.pages.map((page) => {
      let pageChanged = false;
      const messages = page.messages.map((m) => {
        const patched = patcher(m);
        if (patched === m) return m;
        pageChanged = true;
        return patched;
      });
      if (!pageChanged) return page;
      anyChanged = true;
      return { ...page, messages };
    });
    return anyChanged ? { ...old, pages } : old;
  });
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
    () => ably.connection.state === "connected",
  );
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const prevConnectionState = useRef<ConnectionState>(ably.connection.state);

  useEffect(() => {
    const handleConnected = () => {
      const wasDisconnected =
        prevConnectionState.current === "disconnected" ||
        prevConnectionState.current === "suspended";
      prevConnectionState.current = "connected";
      setIsConnected(true);

      if (wasDisconnected && channelId && channelId > 0) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.chat.messages(channelId),
          exact: false,
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
        queryClient.invalidateQueries({ queryKey: queryKeys.chat.unreadTotal() });
      }
    };
    const handleDisconnected = (stateChange: ConnectionStateChange) => {
      prevConnectionState.current = stateChange.current;
      setIsConnected(false);
    };

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
  }, [ably, channelId, queryClient]);

  useEffect(() => {
    if (!orgId || !channelId || channelId <= 0) return;

    const channelName = `chat:${orgId}:${channelId}`;
    const channel = ably.channels.get(channelName);
    let cancelled = false;
    const subscribed: ChatEvent[] = [];

    const messageHandler = (msg: InboundMessage) => {
      const payload = msg.data as AblyMessagePayload;
      if (!payload?.id) return;

      const cacheKey = queryKeys.chat.messages(channelId);

      queryClient.setQueryData<InfiniteData<MessagesPage>>(cacheKey, (old) => {
        if (!old) return old;

        const allExisting = old.pages.flatMap((p) => p.messages);
        if (allExisting.some((m) => m.id === payload.id)) return old;

        const newMessage = payloadToMessage(payload);

        const pages = old.pages.map((page, idx) => {
          if (idx !== 0) return page;
          return { ...page, messages: [...page.messages, newMessage] };
        });

        return { ...old, pages };
      });

      if (payload.replyToId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.chat.thread(channelId, payload.replyToId),
        });
      }

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

    const messageUpdatedHandler = (msg: InboundMessage) => {
      const payload = msg.data as AblyMessageUpdatedPayload;
      if (!payload?.id) return;

      const cacheKey = queryKeys.chat.messages(channelId);
      patchMessagesCache(queryClient, cacheKey, (m) => {
        if (m.id !== payload.id) return m;
        return {
          ...m,
          content: payload.content,
          isEdited: true,
          updatedAt: payload.updatedAt,
        };
      });
    };

    const messageDeletedHandler = (msg: InboundMessage) => {
      const payload = msg.data as AblyMessageDeletedPayload;
      if (!payload?.id) return;

      const cacheKey = queryKeys.chat.messages(channelId);
      patchMessagesCache(queryClient, cacheKey, (m) => {
        if (m.id !== payload.id) return m;
        return { ...m, isDeleted: true, content: null };
      });
    };

    const reactionUpdatedHandler = (msg: InboundMessage) => {
      const payload = msg.data as AblyReactionUpdatedPayload;
      if (!payload?.messageId) return;

      const cacheKey = queryKeys.chat.messages(channelId);
      patchMessagesCache(queryClient, cacheKey, (m) => {
        if (m.id !== payload.messageId) return m;
        return { ...m, reactions: payload.reactions };
      });

      queryClient.setQueryData<InfiniteData<ThreadPage>>(
        queryKeys.chat.thread(channelId, payload.messageId),
        (old) => {
          if (!old) return old;
          let changed = false;
          const pages = old.pages.map((page) => {
            const replies = page.replies.map((r) => {
              if (r.id !== payload.messageId) return r;
              changed = true;
              return { ...r, reactions: payload.reactions };
            });
            const parentMessage =
              page.parentMessage?.id === payload.messageId
                ? { ...page.parentMessage, reactions: payload.reactions }
                : page.parentMessage;
            const parentChanged = parentMessage !== page.parentMessage;
            if (!changed && !parentChanged) return page;
            changed = true;
            return { ...page, replies, parentMessage };
          });
          return changed ? { ...old, pages } : old;
        },
      );
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
        setTypingUsers((prev) =>
          prev.filter((t) => t.userId !== payload.userId),
        );
        typingTimers.current.delete(payload.userId);
      }, TYPING_TIMEOUT_MS);
      typingTimers.current.set(payload.userId, timer);
    };

    const handlers: Record<ChatEvent, (msg: InboundMessage) => void> = {
      message: messageHandler,
      typing: typingHandler,
      "message:updated": messageUpdatedHandler,
      "message:deleted": messageDeletedHandler,
      "reaction:updated": reactionUpdatedHandler,
    };

    async function setup() {
      for (const event of CHAT_EVENTS) {
        if (cancelled) return;
        const handler = handlers[event];
        const ok = await safeSubscribe(channel, event, handler);
        if (cancelled) {
          if (ok) safeUnsubscribe(channel, event, handler);
          return;
        }
        if (ok) subscribed.push(event);
      }
    }

    void setup();

    return () => {
      cancelled = true;
      for (const event of subscribed) {
        safeUnsubscribe(channel, event, handlers[event]);
      }
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
    if (
      !orgId ||
      !channelId ||
      channelId <= 0 ||
      !currentUserId ||
      !isConnected
    )
      return;
    const channelName = `chat:${orgId}:${channelId}`;
    const channel = ably.channels.get(channelName);
    channel
      .publish("typing", {
        userId: currentUserId,
        name: session?.user?.name ?? "Someone",
      })
      .catch(() => {});
  }, [ably, channelId, orgId, currentUserId, isConnected, session?.user?.name]);

  return { isConnected, typingUsers, publishTyping };
}
