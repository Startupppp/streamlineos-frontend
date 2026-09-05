"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAbly } from "ably/react";
import type { InboundMessage, ConnectionState, ConnectionStateChange } from "ably";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { safeSubscribe, safeUnsubscribe } from "@/lib/ably-safe-subscribe";
import { chatChannelName } from "@/lib/ably-channels";
import type {
  Message,
  MessagesPage,
  ThreadPage,
  TypingIndicator,
} from "@/types/chat";
import type { InfiniteData } from "@tanstack/react-query";
import {
  messagePayloadSchema,
  messageUpdatedPayloadSchema,
  messageDeletedPayloadSchema,
  reactionUpdatedPayloadSchema,
  typingPayloadSchema,
  type MessagePayload,
} from "./chat-realtime-schema";

const TYPING_TIMEOUT_MS = 5_000;

const CHAT_EVENTS = ["message", "typing", "message:updated", "message:deleted", "reaction:updated"] as const;
type ChatEvent = (typeof CHAT_EVENTS)[number];

/**
 * The four events the SERVER is the only legitimate author of.
 *
 * The chat token grants each of the caller's own channels `["subscribe", "publish", "history"]`
 * (backend ably.service.ts `createChatTokenRequest`), and `publish` is not decoration — the
 * typing indicator is published from the browser. So any member of a channel can also publish
 * a `message` frame onto it, and this hook used to write `payload.senderId` and
 * `payload.senderName` straight into the message cache and into a desktop Notification: a
 * member could make a message appear, in every open window, attributed to a colleague, with
 * text they chose. Nothing was persisted, which is exactly what makes it hard to notice.
 *
 * The discriminator is `clientId`, which Ably stamps on a message from the identity in the
 * publisher's token and which a publisher cannot forge. The backend publishes over REST with
 * the API key and no `clientId` at all (`AblyService.publishChatMessage`/`publishChatEvent`),
 * so a server frame carries none — and a browser frame always carries one, because every chat
 * token is minted with `clientId: <userId>`. A frame on a server-authored event that arrives
 * WITH a clientId was published by a browser and is dropped.
 */
const SERVER_AUTHORED_EVENTS: ReadonlySet<string> = new Set([
  "message",
  "message:updated",
  "message:deleted",
  "reaction:updated",
]);

export function isTrustedChatFrame(
  event: ChatEvent,
  clientId: string | undefined,
  declaredSenderId: string | undefined,
): boolean {
  if (SERVER_AUTHORED_EVENTS.has(event)) return clientId === undefined || clientId === null;
  // `typing` is genuinely published by a browser. It may only speak for its own publisher,
  // so a frame whose payload names someone else is dropped rather than rendered.
  return clientId === undefined || clientId === null || clientId === declaredSenderId;
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
  typingUsers: TypingIndicator[];
  publishTyping: () => void;
} {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const ably = useAbly();
  const currentUserId = session?.user?.id;
  const orgId = session?.orgId;

  const [socketConnected, setSocketConnected] = useState(
    () => ably.connection.state === "connected",
  );
  // A refused channel attach leaves the CONNECTION healthy, so a verdict read
  // from `ably.connection.state` alone reports "connected" on a window that
  // will never receive a message and keeps the poll fallback switched off.
  // The verdict is the subscribe's own return value.
  const [channelAttached, setChannelAttached] = useState(false);
  const isConnected = socketConnected && channelAttached;
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
      setSocketConnected(true);

      if (wasDisconnected && channelId && channelId > 0) {
        queryClient.invalidateQueries({
          queryKey: collaborationQueryKeys.chat.messages(channelId),
          exact: false,
        });
        queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.myChannels() });
        queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.unreadTotal() });
      }
    };
    const handleDisconnected = (stateChange: ConnectionStateChange) => {
      prevConnectionState.current = stateChange.current;
      setSocketConnected(false);
    };

    ably.connection.on("connected", handleConnected);
    ably.connection.on("disconnected", handleDisconnected);
    ably.connection.on("failed", handleDisconnected);
    ably.connection.on("suspended", handleDisconnected);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocketConnected(ably.connection.state === "connected");

    return () => {
      ably.connection.off("connected", handleConnected);
      ably.connection.off("disconnected", handleDisconnected);
      ably.connection.off("failed", handleDisconnected);
      ably.connection.off("suspended", handleDisconnected);
    };
  }, [ably, channelId, queryClient]);

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
          queryKey: collaborationQueryKeys.chat.thread(channelId, payload.replyToId),
        });
      }

      queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.myChannels() });
      queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.unreadTotal() });

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
      const parsed = messageUpdatedPayloadSchema.safeParse(msg.data);
      if (!parsed.success) return;
      const payload = parsed.data;

      const cacheKey = collaborationQueryKeys.chat.messages(channelId);
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

    const typingHandler = (msg: InboundMessage) => {
      const parsed = typingPayloadSchema.safeParse(msg.data);
      if (!parsed.success) return;
      const payload = parsed.data;
      if (payload.userId === currentUserId) return;

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

    const guardedHandlers = new Map<ChatEvent, (msg: InboundMessage) => void>();
    function guarded(
      event: ChatEvent,
      handler: (msg: InboundMessage) => void,
    ): (msg: InboundMessage) => void {
      const existing = guardedHandlers.get(event);
      if (existing !== undefined) return existing;
      const wrapped = (msg: InboundMessage): void => {
        const declared = (msg.data as { userId?: unknown } | null | undefined)?.userId;
        if (
          !isTrustedChatFrame(
            event,
            msg.clientId ?? undefined,
            typeof declared === "string" ? declared : undefined,
          )
        )
          return;
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
    const channelName = chatChannelName(orgId, channelId);
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
