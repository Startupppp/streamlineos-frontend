"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAbly } from "ably/react";
import type { InboundMessage, ConnectionState, PresenceMessage } from "ably";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { isForgedServerFrame, safeSubscribe, safeUnsubscribe } from "@/lib/ably-safe-subscribe";
import { chatChannelName } from "@/lib/ably-channels";
import {
  invalidateChatInboundMessage,
  invalidateChatReconnect,
} from "@/lib/chat-read-state";
import { mergeInboundMessage } from "@/features/chat/message-page-merge";
import { useAblyConnection } from "@/features/chat/use-ably-connection";
import type { Message, MessagesPage, ThreadPage } from "@/types/chat";
import type { InfiniteData } from "@tanstack/react-query";
import {
  messagePayloadSchema,
  messageUpdatedPayloadSchema,
  messageEntitiesUpdatedPayloadSchema,
  messageDeletedPayloadSchema,
  reactionUpdatedPayloadSchema,
  type MessagePayload,
} from "./chat-realtime-schema";

const TYPING_TIMEOUT_MS = 5_000;

const CHAT_EVENTS = ["message", "message:updated", "message:deleted", "reaction:updated"] as const;
type ChatEvent = (typeof CHAT_EVENTS)[number];

export function isTrustedChatFrame(event: ChatEvent, clientId: string | undefined): boolean {
  return !isForgedServerFrame(event, clientId);
}

export function reconnectShouldResync(
  previousState: ConnectionState,
): boolean {
  return previousState === "disconnected" || previousState === "suspended";
}

function payloadToMessage(payload: MessagePayload): Message {
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
    sender: {
      id: payload.senderId,
      name: payload.senderName ?? null,
      image: payload.senderImage ?? null,
    },
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
  typingUserIds: string[];
  publishTyping: () => void;
} {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const ably = useAbly();
  const currentUserId = session?.user?.id;
  const orgId = session?.orgId;

  const { isConnected: socketConnected, reconnectCount } = useAblyConnection();
  // A refused channel attach leaves the CONNECTION healthy, so a verdict read
  // from `ably.connection.state` alone reports "connected" on a window that
  // will never receive a message and keeps the poll fallback switched off.
  // The verdict is the subscribe's own return value.
  const [channelAttached, setChannelAttached] = useState(false);
  const isConnected = socketConnected && channelAttached;
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const resyncedAtRef = useRef(reconnectCount);

  useEffect(() => {
    if (resyncedAtRef.current === reconnectCount) return;
    resyncedAtRef.current = reconnectCount;
    if (channelId && channelId > 0)
      invalidateChatReconnect(queryClient, channelId);
  }, [reconnectCount, channelId, queryClient]);

  useEffect(() => {
    if (!orgId || !channelId || channelId <= 0) return;

    const channelName = chatChannelName(orgId, channelId);
    const channel = ably.channels.get(channelName);
    let cancelled = false;
    const subscribed: ChatEvent[] = [];

    const messageHandler = (msg: InboundMessage) => {
      const parsed = messagePayloadSchema.safeParse(msg.data);
      if (!parsed.success) return;
      const payload = parsed.data;

      const cacheKey = collaborationQueryKeys.chat.messages(channelId);

      queryClient.setQueryData<InfiniteData<MessagesPage>>(cacheKey, (old) => {
        if (!old) return old;
        return mergeInboundMessage(
          old,
          payloadToMessage(payload),
          payload.clientKey,
        );
      });

      invalidateChatInboundMessage(
        queryClient,
        channelId,
        payload.replyToId ?? null,
      );
    };

    const messageUpdatedHandler = (msg: InboundMessage) => {
      const cacheKey = collaborationQueryKeys.chat.messages(channelId);
      const parsed = messageUpdatedPayloadSchema.safeParse(msg.data);
      if (!parsed.success) {
        if (messageEntitiesUpdatedPayloadSchema.safeParse(msg.data).success)
          void queryClient.invalidateQueries({ queryKey: cacheKey });
        return;
      }
      const payload = parsed.data;

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
      const parsed = messageDeletedPayloadSchema.safeParse(msg.data);
      if (!parsed.success) return;
      const payload = parsed.data;

      const cacheKey = collaborationQueryKeys.chat.messages(channelId);
      patchMessagesCache(queryClient, cacheKey, (m) => {
        if (m.id !== payload.id) return m;
        return { ...m, isDeleted: true, content: null };
      });
    };

    const reactionUpdatedHandler = (msg: InboundMessage) => {
      const parsed = reactionUpdatedPayloadSchema.safeParse(msg.data);
      if (!parsed.success) return;
      const payload = parsed.data;

      const cacheKey = collaborationQueryKeys.chat.messages(channelId);
      patchMessagesCache(queryClient, cacheKey, (m) => {
        if (m.id !== payload.messageId) return m;
        return { ...m, reactions: payload.reactions };
      });

      queryClient.setQueryData<InfiniteData<ThreadPage>>(
        collaborationQueryKeys.chat.thread(channelId, payload.messageId),
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

    const handlers: Record<ChatEvent, (msg: InboundMessage) => void> = {
      message: messageHandler,
      "message:updated": messageUpdatedHandler,
      "message:deleted": messageDeletedHandler,
      "reaction:updated": reactionUpdatedHandler,
    };

    const guardedHandlers = new Map<ChatEvent, (msg: InboundMessage) => void>();
    function guarded(
      event: ChatEvent,
      handler: (msg: InboundMessage) => void,
    ): (msg: InboundMessage) => void {
      const existing = guardedHandlers.get(event);
      if (existing !== undefined) return existing;
      const wrapped = (msg: InboundMessage): void => {
        if (!isTrustedChatFrame(event, msg.clientId ?? undefined)) return;
        handler(msg);
      };
      guardedHandlers.set(event, wrapped);
      return wrapped;
    }

    async function setup() {
      for (const event of CHAT_EVENTS) {
        if (cancelled) return;
        const handler = guarded(event, handlers[event]);
        const ok = await safeSubscribe(channel, event, handler);
        if (cancelled) {
          if (ok) safeUnsubscribe(channel, event, handler);
          return;
        }
        if (ok) subscribed.push(event);
      }
      if (!cancelled) setChannelAttached(subscribed.length === CHAT_EVENTS.length);
    }

    void setup();

    return () => {
      cancelled = true;
      setChannelAttached(false);
      for (const event of subscribed) {
        safeUnsubscribe(channel, event, guarded(event, handlers[event]));
      }
    };
  }, [ably, channelId, orgId, queryClient, currentUserId]);

  useEffect(() => {
    if (!orgId || !channelId || channelId <= 0) return;
    const channel = ably.channels.get(chatChannelName(orgId, channelId));
    const timers = typingTimers.current;
    const stop = (userId: string): void => {
      const timer = timers.get(userId);
      if (timer) clearTimeout(timer);
      timers.delete(userId);
      setTypingUserIds((prev) => prev.filter((id) => id !== userId));
    };
    const listener = (member: PresenceMessage): void => {
      const userId = member.clientId;
      if (!userId || userId === currentUserId) return;
      const typing =
        member.action !== "leave" &&
        member.action !== "absent" &&
        typeof member.data === "object" &&
        member.data !== null &&
        "typing" in member.data &&
        member.data.typing === true;
      if (!typing) return stop(userId);
      setTypingUserIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
      const existing = timers.get(userId);
      if (existing) clearTimeout(existing);
      timers.set(userId, setTimeout(() => stop(userId), TYPING_TIMEOUT_MS));
    };
    void channel.presence.subscribe(listener).catch(() => {});
    return () => {
      channel.presence.unsubscribe(listener);
      void channel.presence.leave().catch(() => {});
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      setTypingUserIds([]);
    };
  }, [ably, channelId, orgId, currentUserId]);

  const publishTyping = useCallback(() => {
    if (!orgId || !channelId || channelId <= 0 || !currentUserId || !isConnected) return;
    void ably.channels
      .get(chatChannelName(orgId, channelId))
      .presence.update({ typing: true })
      .catch(() => {});
  }, [ably, channelId, orgId, currentUserId, isConnected]);

  return { isConnected, typingUserIds, publishTyping };
}
