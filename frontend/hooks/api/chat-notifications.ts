"use client";

import { useEffect, useMemo, useRef } from "react";
import { useAbly } from "ably/react";
import type { InboundMessage } from "ably";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { safeSubscribe, safeUnsubscribe } from "@/lib/ably-safe-subscribe";
import { chatChannelName, notificationsChannelName } from "@/lib/ably-channels";
import { reauthorizeAblyClients } from "@/lib/ably";
import type { Channel } from "@/types/chat";
import { isRecord } from "@/lib/is-record";

/**
 * An Ably message body is `any`, so asserting it into a payload interface
 * checked nothing. Read the four fields the handler uses and verify each.
 */
function readChatNotification(data: unknown): {
  id: number;
  senderId: unknown;
  senderName: string | null;
  content: string | null;
} | null {
  if (!isRecord(data) || typeof data.id !== "number" || !data.id) return null;
  return {
    id: data.id,
    senderId: data.senderId,
    senderName: typeof data.senderName === "string" ? data.senderName : null,
    content: typeof data.content === "string" ? data.content : null,
  };
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

  const channelIdSignature = useMemo(
    () =>
      (channels ?? [])
        .map((c) => c.id)
        .sort((a, b) => a - b)
        .join(","),
    [channels],
  );

  // RT-003: the second on-mount permission prompt, removed. Opening chat is not
  // consent to be notified, and a denial here is effectively permanent — the ask now
  // belongs to the explicit control in notification preferences (`usePushSubscription`).
  // Chat still shows OS notifications when permission was already granted.

  useEffect(() => {
    if (!orgId || channelIdSignature === "") return;

    // Captured after the guard: the narrowing does not reach into the hoisted
    // `setup` declaration below, and the channel name builder takes a string.
    const org = orgId;
    const channelIds = channelIdSignature.split(",").map(Number);
    let cancelled = false;
    const subs: Array<{
      ch: ReturnType<typeof ably.channels.get>;
      h: (msg: InboundMessage) => void;
    }> = [];

    async function setup() {
      for (const channelId of channelIds) {
        if (cancelled) return;

        const ablyChannel = ably.channels.get(chatChannelName(org, channelId));

        const handler = (msg: InboundMessage) => {
          const payload = readChatNotification(msg.data);
          if (!payload || payload.senderId === currentUserIdRef.current) return;

          const current = channelsRef.current?.find((c) => c.id === channelId);
          const channelType = current?.type;
          const channelDisplayName = current?.name;

          queryClient.invalidateQueries({
            queryKey: collaborationQueryKeys.chat.myChannels(),
            exact: true,
          });
          queryClient.invalidateQueries({
            queryKey: collaborationQueryKeys.chat.unreadTotal(),
            exact: true,
          });

          if (channelId === activeChannelIdRef.current) return;

          const senderName = payload.senderName ?? "Someone";
          const title =
            channelType === "DIRECT"
              ? senderName
              : `#${channelDisplayName ?? "channel"}`;
          const body = payload.content?.slice(0, 80) ?? "Sent an attachment";

          toast(title, { description: body, duration: 5_000 });

          if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification(title, { body, icon: "/favicon.ico" });
          }
        };

        const ok = await safeSubscribe(ablyChannel, "message", handler);
        if (cancelled) {
          if (ok) safeUnsubscribe(ablyChannel, "message", handler);
          return;
        }
        if (ok) subs.push({ ch: ablyChannel, h: handler });
      }
    }

    void setup();

    return () => {
      cancelled = true;
      for (const { ch, h } of subs) {
        safeUnsubscribe(ch, "message", h);
      }
    };
  }, [orgId, channelIdSignature, ably, queryClient]);

  useEffect(() => {
    if (!orgId || !currentUserId) return;

    const notifChannel = ably.channels.get(notificationsChannelName(orgId, currentUserId));
    let cancelled = false;
    let subscribed = false;

    const capabilityHandler = (_msg: InboundMessage) => {
      void reauthorizeAblyClients();
    };

    void safeSubscribe(notifChannel, "realtime:capability:refresh", capabilityHandler).then((ok) => {
      if (cancelled) {
        if (ok) safeUnsubscribe(notifChannel, "realtime:capability:refresh", capabilityHandler);
        return;
      }
      subscribed = ok;
    });

    return () => {
      cancelled = true;
      if (subscribed) safeUnsubscribe(notifChannel, "realtime:capability:refresh", capabilityHandler);
    };
  }, [orgId, currentUserId, ably]);
}
