"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAbly } from "ably/react";
import type { InboundMessage, PresenceMessage } from "ably";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { isForgedServerFrame, safeSubscribe, safeUnsubscribe } from "@/lib/ably-safe-subscribe";
import { chatChannelName } from "@/lib/ably-channels";
import { applyDeletedUnread, invalidateChatReconnect } from "@/hooks/api/chat-read-cache";
import {
  appendThreadReply,
  flattenMessagePages,
  mergeInboundMessage,
} from "@/features/chat/message-page-merge";
import {
  contextWindowsHolding,
  findCachedMessage,
  patchChatMessage,
} from "@/hooks/api/chat-message-cache";
import { patchChannelRow } from "@/hooks/api/chat-channel-cache";
import { useAblyConnection } from "@/features/chat/use-ably-connection";
import {
  chatSendVisible,
  noteChatDuplicateDropped,
  recordChatReconnectGap,
  setChatTelemetryRealtime,
  useChatTelemetryFlush,
} from "@/hooks/api/chat-telemetry";
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
const TYPING_IDLE_MS = 3_000;

const CHAT_EVENTS = ["message", "message:updated", "message:deleted", "reaction:updated"] as const;
type ChatEvent = (typeof CHAT_EVENTS)[number];

function payloadToMessage(payload: MessagePayload, parent: Message | undefined): Message {
  const createdAt = payload.createdAt ?? new Date().toISOString();
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
    reactions: {},
    clientKey: payload.clientKey ?? null,
    createdAt,
    updatedAt: createdAt,
    sender: {
      id: payload.senderId,
      name: payload.senderName ?? null,
      image: payload.senderImage ?? null,
    },
    attachments: payload.attachments ?? [],
    replyTo: parent ? { id: parent.id, content: parent.content, sender: parent.sender } : null,
  };
}

function messagesAddedByResync(
  before: InfiniteData<MessagesPage>,
  after: InfiniteData<MessagesPage>,
): number {
  const known = flattenMessagePages(before);
  const ids = new Set(known.map((message) => message.id));
  const clientKeys = new Set(known.flatMap((message) => (message.clientKey ? [message.clientKey] : [])));
  return flattenMessagePages(after).filter(
    (message) => !ids.has(message.id) && !(message.clientKey && clientKeys.has(message.clientKey)),
  ).length;
}

export function useChatRealtime(
  channelId: number | null,
  joinRequired = false,
): {
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
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resyncedAtRef = useRef(reconnectCount);

  useChatTelemetryFlush();

  useEffect(() => {
    setChatTelemetryRealtime(isConnected);
  }, [isConnected]);

  useEffect(() => {
    if (resyncedAtRef.current === reconnectCount) return;
    resyncedAtRef.current = reconnectCount;
    if (!channelId || channelId <= 0) return;
    const messagesKey = collaborationQueryKeys.chat.messages(channelId);
    const before = queryClient.getQueryData<InfiniteData<MessagesPage>>(messagesKey);
    void invalidateChatReconnect(queryClient, channelId)
      .then(() => {
        const after = queryClient.getQueryData<InfiniteData<MessagesPage>>(messagesKey);
        if (before && after) recordChatReconnectGap(messagesAddedByResync(before, after));
      })
      .catch(() => undefined);
  }, [reconnectCount, channelId, queryClient]);

  useEffect(() => {
    if (joinRequired || !orgId || !channelId || channelId <= 0) return;

    const channelName = chatChannelName(orgId, channelId);
    const channel = ably.channels.get(channelName);
    let cancelled = false;
    const subscribed: ChatEvent[] = [];

    const messageHandler = (msg: InboundMessage) => {
      const parsed = messagePayloadSchema.safeParse(msg.data);
      if (!parsed.success) return;
      const payload = parsed.data;
      const parent =
        payload.replyToId != null ? findCachedMessage(queryClient, channelId, payload.replyToId) : undefined;
      const incoming = payloadToMessage(payload, parent);

      const messagesKey = collaborationQueryKeys.chat.messages(channelId);
      const cached = queryClient.getQueryData<InfiniteData<MessagesPage>>(messagesKey);
      if (cached) {
        const merged = mergeInboundMessage(cached, incoming, payload.clientKey);
        if (merged !== cached) queryClient.setQueryData<InfiniteData<MessagesPage>>(messagesKey, merged);
        else if (payload.senderId !== currentUserId) noteChatDuplicateDropped(payload.clientKey);
      }
      if (payload.replyToId != null)
        queryClient.setQueryData<InfiniteData<ThreadPage>>(
          collaborationQueryKeys.chat.thread(channelId, payload.replyToId),
          (old) => appendThreadReply(old, incoming),
        );
      chatSendVisible(payload.clientKey);
      patchChannelRow(queryClient, channelId, (channel) => ({
        ...channel,
        lastMessage: {
          content: incoming.content,
          senderName: incoming.sender.name,
          createdAt: incoming.createdAt,
        },
      }));
    };

    const messageUpdatedHandler = (msg: InboundMessage) => {
      const parsed = messageUpdatedPayloadSchema.safeParse(msg.data);
      if (!parsed.success) {
        const entities = messageEntitiesUpdatedPayloadSchema.safeParse(msg.data);
        if (!entities.success) return;
        for (const queryKey of [
          collaborationQueryKeys.chat.messages(channelId),
          ...contextWindowsHolding(queryClient, channelId, entities.data.id),
        ])
          void queryClient.invalidateQueries({ queryKey, exact: true });
        return;
      }
      const { id, content, updatedAt } = parsed.data;
      patchChatMessage(queryClient, channelId, id, { content, isEdited: true, updatedAt });
    };

    const messageDeletedHandler = (msg: InboundMessage) => {
      const parsed = messageDeletedPayloadSchema.safeParse(msg.data);
      if (!parsed.success) return;
      applyDeletedUnread(queryClient, findCachedMessage(queryClient, channelId, parsed.data.id), currentUserId);
      patchChatMessage(queryClient, channelId, parsed.data.id, { isDeleted: true, content: null });
    };

    const reactionUpdatedHandler = (msg: InboundMessage) => {
      const parsed = reactionUpdatedPayloadSchema.safeParse(msg.data);
      if (!parsed.success) return;
      const { messageId, reactions } = parsed.data;
      patchChatMessage(queryClient, channelId, messageId, { reactions });
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
        if (isForgedServerFrame(event, msg.clientId)) return;
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
  }, [ably, channelId, orgId, queryClient, currentUserId, joinRequired]);

  useEffect(() => {
    if (joinRequired || !orgId || !channelId || channelId <= 0) return;
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
        (member.action === "enter" || member.action === "update") &&
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
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = null;
      setTypingUserIds([]);
    };
  }, [ably, channelId, orgId, currentUserId, joinRequired]);

  const publishTyping = useCallback(() => {
    if (!orgId || !channelId || channelId <= 0 || !currentUserId || !isConnected) return;
    const channel = ably.channels.get(chatChannelName(orgId, channelId));
    void channel.presence.update({ typing: true }).catch(() => {});
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      idleTimer.current = null;
      void channel.presence.update({ typing: false }).catch(() => {});
    }, TYPING_IDLE_MS);
  }, [ably, channelId, orgId, currentUserId, isConnected]);

  return { isConnected, typingUserIds, publishTyping };
}
