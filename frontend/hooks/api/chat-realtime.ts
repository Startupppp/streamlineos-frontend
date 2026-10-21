"use client";

import { useEffect, useState, useRef } from "react";
import { useAbly } from "ably/react";
import type { InboundMessage } from "ably";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import {
  isForgedServerFrame,
  safeSubscribe,
  safeUnsubscribe,
} from "@/lib/ably-safe-subscribe";
import { chatChannelName } from "@/lib/ably-channels";
import {
  applyDeletedUnread,
  invalidateChatReconnect,
} from "@/hooks/api/chat-read-cache";
import {
  appendThreadReply,
  mergeInboundMessage,
} from "@/features/chat/message-page-merge";
import {
  contextWindowsHolding,
  findCachedMessage,
  patchChatMessage,
} from "@/hooks/api/chat-message-cache";
import { patchChannelRow } from "@/hooks/api/chat-channel-cache";
import { useAblyConnection } from "@/features/chat/use-ably-connection";
import { recordChatArrival } from "@/features/chat/chat-arrivals";
import {
  chatSendVisible,
  noteChatDuplicateDropped,
  recordChatReconnectGap,
  setChatTelemetryRealtime,
  useChatTelemetryFlush,
} from "@/hooks/api/chat-telemetry";
import type { MessagesPage, ThreadPage } from "@/types/chat";
import {
  messagesAddedByResync,
  payloadToMessage,
  reviveFailedChannel,
} from "./chat-realtime-helpers";
import type { InfiniteData } from "@tanstack/react-query";
import {
  messagePayloadSchema,
  messageUpdatedPayloadSchema,
  messageEntitiesUpdatedPayloadSchema,
  messageDeletedPayloadSchema,
  reactionUpdatedPayloadSchema,
} from "./chat-realtime-schema";
import { useChatTyping } from "./chat-realtime-typing";

const CHAT_EVENTS = [
  "message",
  "message:updated",
  "message:deleted",
  "reaction:updated",
] as const;
type ChatEvent = (typeof CHAT_EVENTS)[number];

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

  const [channelAttached, setChannelAttached] = useState(false);
  const isConnected = socketConnected && channelAttached;
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
    const before =
      queryClient.getQueryData<InfiniteData<MessagesPage>>(messagesKey);
    void invalidateChatReconnect(queryClient, channelId)
      .then(() => {
        const after =
          queryClient.getQueryData<InfiniteData<MessagesPage>>(messagesKey);
        if (before && after)
          recordChatReconnectGap(messagesAddedByResync(before, after));
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
        payload.replyToId != null
          ? findCachedMessage(queryClient, channelId, payload.replyToId)
          : undefined;
      const incoming = payloadToMessage(payload, parent);

      const messagesKey = collaborationQueryKeys.chat.messages(channelId);
      const cached =
        queryClient.getQueryData<InfiniteData<MessagesPage>>(messagesKey);
      if (cached) {
        const merged = mergeInboundMessage(cached, incoming, payload.clientKey);
        if (merged !== cached) {
          queryClient.setQueryData<InfiniteData<MessagesPage>>(
            messagesKey,
            merged,
          );
          recordChatArrival(channelId);
        } else if (payload.senderId !== currentUserId)
          noteChatDuplicateDropped(payload.clientKey);
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
        const entities = messageEntitiesUpdatedPayloadSchema.safeParse(
          msg.data,
        );
        if (!entities.success) return;
        for (const queryKey of [
          collaborationQueryKeys.chat.messages(channelId),
          ...contextWindowsHolding(queryClient, channelId, entities.data.id),
        ])
          void queryClient.invalidateQueries({ queryKey, exact: true });
        return;
      }
      const { id, content, updatedAt } = parsed.data;
      patchChatMessage(queryClient, channelId, id, {
        content,
        isEdited: true,
        updatedAt,
      });
    };

    const messageDeletedHandler = (msg: InboundMessage) => {
      const parsed = messageDeletedPayloadSchema.safeParse(msg.data);
      if (!parsed.success) return;
      applyDeletedUnread(
        queryClient,
        findCachedMessage(queryClient, channelId, parsed.data.id),
        currentUserId,
      );
      patchChatMessage(queryClient, channelId, parsed.data.id, {
        isDeleted: true,
        content: null,
      });
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

    async function subscribeMissing(): Promise<void> {
      for (const event of CHAT_EVENTS) {
        if (cancelled) return;
        if (subscribed.includes(event)) continue;
        const handler = guarded(event, handlers[event]);
        const ok = await safeSubscribe(channel, event, handler);
        if (cancelled) {
          if (ok) safeUnsubscribe(channel, event, handler);
          return;
        }
        if (ok) subscribed.push(event);
      }
    }

    async function setup() {
      await reviveFailedChannel(channel);
      await subscribeMissing();
      if (
        !cancelled &&
        subscribed.length < CHAT_EVENTS.length &&
        channel.state === "failed"
      ) {
        for (const event of CHAT_EVENTS)
          if (!subscribed.includes(event))
            safeUnsubscribe(channel, event, guarded(event, handlers[event]));
        await reviveFailedChannel(channel);
        await subscribeMissing();
      }
      if (!cancelled)
        setChannelAttached(subscribed.length === CHAT_EVENTS.length);
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

  const { typingUserIds, publishTyping } = useChatTyping({
    ably,
    channelId,
    orgId,
    currentUserId,
    joinRequired,
    isConnected,
  });

  return { isConnected, typingUserIds, publishTyping };
}
