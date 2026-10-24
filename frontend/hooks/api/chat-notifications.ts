"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAbly } from "ably/react";
import type { InboundMessage } from "ably";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { isForgedServerFrame, safeSubscribe, safeUnsubscribe } from "@/lib/ably-safe-subscribe";
import { chatChannelName, notificationsChannelName } from "@/lib/ably-channels";
import { reauthorizeAblyClients } from "@/lib/ably";
import { isRecord } from "@/lib/is-record";
import {
  forgetChannelUnread,
  readChatNotification,
  rememberMessage,
  rememberUnread,
  viewerIsReading,
} from "@/hooks/api/chat-notification-tracking";
import {
  chatAlertDecision,
  chatAlertIsRaised,
  viewerChannelState,
} from "@/lib/chat-alert-policy";
import {
  applyDeletedUnread,
  decrementChannelUnread,
  markChannelTimelineStale,
  patchUnreadTotal,
  recordInboundChannelMessage,
} from "@/hooks/api/chat-read-cache";
import {
  patchLastMessageAfterDelete,
  patchLastMessageIfLatest,
} from "@/hooks/api/chat-channel-cache";
import { findCachedMessage, patchChatMessage } from "@/hooks/api/chat-message-cache";
import {
  messageDeletedPayloadSchema,
  messageUpdatedPayloadSchema,
} from "@/hooks/api/chat-realtime-schema";
import type { Channel } from "@/types/chat";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";

type BackgroundChannelEvent = "message" | "message:deleted" | "message:updated" | "reaction:updated";

function dmPartnerDisplayName(
  members: Channel["members"] | undefined,
  currentUserId: string | undefined,
): string | null {
  const partner = members?.find(
    (member) => member.user?.id && member.user.id !== currentUserId,
  );
  return partner?.user?.name ?? null;
}

function inboundToastCopy(
  channelType: Channel["type"] | undefined,
  channelDisplayName: string | null | undefined,
  members: Channel["members"] | undefined,
  currentUserId: string | undefined,
  senderName: string | null,
  content: string | null,
): { title: string; body: string } {
  const partnerName = dmPartnerDisplayName(members, currentUserId);
  const resolvedSender =
    senderName?.trim() ||
    (channelType === "DIRECT" ? partnerName : null) ||
    "Someone";
  const title =
    channelType === "DIRECT"
      ? resolvedSender === "Direct message" && partnerName
        ? partnerName
        : resolvedSender
      : `#${channelDisplayName ?? "channel"}`;
  const snippet = content?.trim() ?? "";
  const genericDmSnippet =
    channelType === "DIRECT" &&
    (!snippet || snippet === "Direct message" || snippet === resolvedSender);
  const body = genericDmSnippet
    ? "Sent you a message"
    : snippet
      ? snippet.slice(0, 80)
      : "Sent an attachment";
  return { title, body };
}

export function useChatGlobalNotifications(
  channels: Channel[] | undefined,
  activeChannelId: number | null,
  currentUserId: string | undefined
) {
  const ably = useAbly();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const orgId = session?.orgId;

  const activeChannelIdRef = useRef(activeChannelId);
  // eslint-disable-next-line react-hooks/refs
  activeChannelIdRef.current = activeChannelId;

  const currentUserIdRef = useRef(currentUserId);
  // eslint-disable-next-line react-hooks/refs
  currentUserIdRef.current = currentUserId;

  const channelsRef = useRef(channels);
  // eslint-disable-next-line react-hooks/refs
  channelsRef.current = channels;

  const [seen] = useState(() => new Set<number>());
  const [countedUnread] = useState(() => new Map<number, number>());

  const channelIdSignature = useMemo(
    () =>
      (channels ?? [])
        .map((c) => c.id)
        .sort((a, b) => a - b)
        .join(","),
    [channels],
  );

  useEffect(() => {
    if (!orgId || channelIdSignature === "") return;

    const org = orgId;
    const channelIds = channelIdSignature.split(",").map(Number);
    let cancelled = false;
    const subs: Array<{
      ch: ReturnType<typeof ably.channels.get>;
      event: BackgroundChannelEvent;
      h: (msg: InboundMessage) => void;
    }> = [];

    async function setup() {
      for (const channelId of channelIds) {
        if (cancelled) return;

        const ablyChannel = ably.channels.get(chatChannelName(org, channelId));

        const handler = (msg: InboundMessage) => {
          if (isForgedServerFrame("message", msg.clientId)) return;
          const payload = readChatNotification(msg.data);
          if (!payload) return;
          if (channelId !== activeChannelIdRef.current) markChannelTimelineStale(queryClient, channelId);
          if (payload.senderId === currentUserIdRef.current) return;
          if (!rememberMessage(seen, payload.id)) return;

          const current = channelsRef.current?.find((c) => c.id === channelId);
          const channelType = current?.type;
          const channelDisplayName = current?.name;

          const countsAsUnread = !viewerIsReading(channelId, activeChannelIdRef.current);
          if (countsAsUnread) rememberUnread(countedUnread, payload.id, channelId);
          recordInboundChannelMessage(queryClient, {
            channelId,
            content: payload.content,
            senderName: payload.senderName,
            createdAt: payload.createdAt,
            countsAsUnread,
          });

          const decision = chatAlertDecision({
            kind: "message",
            channelId,
            senderId: payload.senderId,
            currentUserId: currentUserIdRef.current,
            activeChannelId: activeChannelIdRef.current,
            viewer: viewerChannelState(current, currentUserIdRef.current),
          });
          if (!chatAlertIsRaised(decision)) return;

          const { title, body } = inboundToastCopy(
            channelType,
            channelDisplayName,
            current?.members,
            currentUserIdRef.current,
            payload.senderName,
            payload.content,
          );

          toast(title, { description: body, duration: 5_000 });

          if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification(title, { body, icon: "/favicon.ico" });
          }
        };

        const deletedHandler = (msg: InboundMessage) => {
          if (isForgedServerFrame("message:deleted", msg.clientId)) return;
          if (channelId === activeChannelIdRef.current) return;
          const parsed = messageDeletedPayloadSchema.safeParse(msg.data);
          if (!parsed.success) return;
          markChannelTimelineStale(queryClient, channelId);
          const messageId = parsed.data.id;
          if (countedUnread.get(messageId) === channelId) {
            countedUnread.delete(messageId);
            decrementChannelUnread(queryClient, channelId);
          } else {
            applyDeletedUnread(
              queryClient,
              findCachedMessage(queryClient, channelId, messageId),
              currentUserIdRef.current,
            );
          }
          patchChatMessage(queryClient, channelId, messageId, { isDeleted: true, content: null });
          patchLastMessageAfterDelete(queryClient, channelId, messageId);
        };

        const messageUpdatedHandler = (msg: InboundMessage) => {
          if (isForgedServerFrame("message:updated", msg.clientId)) return;
          if (channelId === activeChannelIdRef.current) return;
          const parsed = messageUpdatedPayloadSchema.safeParse(msg.data);
          if (!parsed.success) {
            markChannelTimelineStale(queryClient, channelId);
            return;
          }
          markChannelTimelineStale(queryClient, channelId);
          const { id, content, updatedAt } = parsed.data;
          patchChatMessage(queryClient, channelId, id, {
            content,
            isEdited: true,
            updatedAt,
          });
          patchLastMessageIfLatest(queryClient, channelId, id, content);
        };

        const reactionUpdatedHandler = (msg: InboundMessage) => {
          if (isForgedServerFrame("reaction:updated", msg.clientId)) return;
          if (channelId === activeChannelIdRef.current) return;
          markChannelTimelineStale(queryClient, channelId);
        };

        for (const [event, h] of [
          ["message", handler],
          ["message:deleted", deletedHandler],
          ["message:updated", messageUpdatedHandler],
          ["reaction:updated", reactionUpdatedHandler],
        ] as const) {
          const ok = await safeSubscribe(ablyChannel, event, h);
          if (cancelled) {
            if (ok) safeUnsubscribe(ablyChannel, event, h);
            return;
          }
          if (ok) subs.push({ ch: ablyChannel, event, h });
        }
      }
    }

    void setup();

    return () => {
      cancelled = true;
      for (const { ch, event, h } of subs) {
        safeUnsubscribe(ch, event, h);
      }
    };
  }, [orgId, channelIdSignature, ably, queryClient, seen, countedUnread]);

  useEffect(() => {
    if (activeChannelId !== null) forgetChannelUnread(countedUnread, activeChannelId);
  }, [activeChannelId, countedUnread]);

  useEffect(() => {
    if (countedUnread.size === 0) return;
    for (const channelId of new Set(countedUnread.values())) {
      if (channels?.find((c) => c.id === channelId)?.unreadCount === 0)
        forgetChannelUnread(countedUnread, channelId);
    }
  }, [channels, countedUnread]);

  useEffect(() => {
    if (!orgId || !currentUserId) return;

    const notifChannel = ably.channels.get(notificationsChannelName(orgId, currentUserId));
    let cancelled = false;

    const capabilityHandler = (_msg: InboundMessage) => {
      void reauthorizeAblyClients();
    };

    const inboxHandler = (event: string) => (msg: InboundMessage) => {
      if (isForgedServerFrame(event, msg.clientId)) return;
      const data: unknown = msg.data;
      if (!isRecord(data) || typeof data.channelId !== "number") return;
      const channelId = data.channelId;
      const loaded = channelsRef.current?.find((c) => c.id === channelId);
      if (loaded !== undefined) return;
      const firstSighting = typeof data.messageId !== "number" || rememberMessage(seen, data.messageId);
      if (firstSighting) {
        patchUnreadTotal(queryClient, (total) => total + 1);
        void queryClient.invalidateQueries({
          queryKey: collaborationQueryKeys.chat.myChannels(),
          exact: true,
        });
      }
      const decision = chatAlertDecision({
        kind: event === "notification:mention" ? "mention" : "message",
        channelId,
        senderId: data.senderId,
        currentUserId: currentUserIdRef.current,
        activeChannelId: activeChannelIdRef.current,
        viewer: viewerChannelState(loaded, currentUserIdRef.current),
      });
      if (!chatAlertIsRaised(decision)) return;
      const senderName = typeof data.senderName === "string" && data.senderName ? data.senderName : "Someone";
      const mention = event === "notification:mention";
      toast(mention ? `${senderName} mentioned you` : senderName, {
        description: mention ? undefined : "Sent you a message",
        duration: 5_000,
      });
    };

    const listeners: Array<[string, (msg: InboundMessage) => void]> = [
      ["realtime:capability:refresh", capabilityHandler],
      ["notification:message", inboxHandler("notification:message")],
      ["notification:mention", inboxHandler("notification:mention")],
    ];
    const subscribed: typeof listeners = [];

    void (async () => {
      for (const listener of listeners) {
        const ok = await safeSubscribe(notifChannel, listener[0], listener[1]);
        if (cancelled) {
          if (ok) safeUnsubscribe(notifChannel, listener[0], listener[1]);
          return;
        }
        if (ok) subscribed.push(listener);
      }
    })();

    return () => {
      cancelled = true;
      for (const [event, handler] of subscribed) safeUnsubscribe(notifChannel, event, handler);
    };
  }, [orgId, currentUserId, ably, queryClient, seen]);
}
