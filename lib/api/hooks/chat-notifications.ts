"use client";

/**
 * Global chat notification hook.
 * Subscribes to ALL of the user's channels via Ably and fires in-app toasts
 * + browser (desktop) notifications for messages received in channels other
 * than the currently active one.
 *
 * Must be rendered inside <ChatAblyProvider>.
 */

import { useEffect, useRef } from "react";
import { useAbly } from "ably/react";
import type { InboundMessage } from "ably";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import type { Channel } from "@/types/chat";

interface NotificationPayload {
  id?: number;
  senderId?: string;
  senderName?: string | null;
  content?: string | null;
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

  // Refs so handlers always read the latest values without triggering re-subscription
  const activeChannelIdRef = useRef(activeChannelId);
  activeChannelIdRef.current = activeChannelId;

  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;

  // Request desktop notification permission on first render
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!orgId || !channels?.length) return;

    const subs: Array<{
      ch: ReturnType<typeof ably.channels.get>;
      h: (msg: InboundMessage) => void;
    }> = [];

    for (const channel of channels) {
      const ablyChannel = ably.channels.get(`chat:${orgId}:${channel.id}`);
      const channelId = channel.id;
      const channelType = channel.type;
      const channelDisplayName = channel.name;

      const handler = (msg: InboundMessage) => {
        const payload = msg.data as NotificationPayload;
        if (!payload?.id || payload.senderId === currentUserIdRef.current) return;

        // Keep unread counts fresh
        queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
        queryClient.invalidateQueries({ queryKey: queryKeys.chat.unreadTotal() });

        // No notification for the currently active (and visible) channel
        if (channelId === activeChannelIdRef.current) return;

        const senderName = payload.senderName ?? "Someone";
        const title =
          channelType === "DIRECT"
            ? senderName
            : `#${channelDisplayName ?? "channel"}`;
        const body = payload.content?.slice(0, 80) ?? "Sent an attachment";

        // In-app toast
        toast(title, { description: body, duration: 5_000 });

        // Always show Chrome desktop notification
        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          new Notification(title, { body, icon: "/favicon.ico" });
        }
      };

      ablyChannel.subscribe("message", handler);
      subs.push({ ch: ablyChannel, h: handler });
    }

    return () => {
      for (const { ch, h } of subs) {
        ch.unsubscribe("message", h);
      }
    };
  }, [orgId, channels, ably, queryClient]);
}
