"use client";

/**
 * Cross-page chat notification component.
 * Uses the periodic channel list poll (every 30 s) to detect new unread counts
 * and fires in-app toasts + desktop notifications — even when not on /chat.
 *
 * When the user IS on /chat, this component yields to the Ably-based
 * `useChatGlobalNotifications` hook (chat/page.tsx) which provides real-time
 * notifications, so polling-based notifications are disabled there.
 */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { useChatChannels } from "@/lib/api/hooks/chat";
import type { Channel } from "@/types/chat";

export function ChatUnreadNotifications({ currentUserId }: { currentUserId: string }) {
  const pathname = usePathname();
  // Chat page handles its own Ably real-time notifications; skip polling there.
  const isChatPage = pathname === "/chat";

  const { data: rawChannels } = useChatChannels(!isChatPage);
  const channels = rawChannels as Channel[] | undefined;

  const prevUnreadMapRef = useRef<Map<number, number>>(new Map());
  const isFirstLoadRef = useRef(true);

  // Request desktop notification permission on mount
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!channels || channels.length === 0) return;

    if (isFirstLoadRef.current) {
      // Store baseline counts without emitting notifications for pre-existing unreads
      const initial = new Map<number, number>();
      for (const ch of channels) {
        initial.set(ch.id, ch.unreadCount);
      }
      prevUnreadMapRef.current = initial;
      isFirstLoadRef.current = false;
      return;
    }

    const prev = prevUnreadMapRef.current;
    const next = new Map<number, number>();

    for (const ch of channels) {
      next.set(ch.id, ch.unreadCount);
      const prevCount = prev.get(ch.id) ?? 0;

      if (ch.unreadCount > prevCount) {
        const delta = ch.unreadCount - prevCount;

        const otherMember =
          ch.type === "DIRECT"
            ? ch.members?.find((m) => m.user?.id !== currentUserId)?.user
            : null;
        const title =
          ch.type === "DIRECT"
            ? (otherMember?.name ?? "New message")
            : `#${ch.name}`;
        const body =
          delta === 1
            ? ch.lastMessage?.content?.slice(0, 80) ?? "New message"
            : `${delta} new messages`;

        toast(title, { description: body, duration: 5_000 });

        // Always show Chrome desktop notification (fires on other apps/desktops too)
        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          new Notification(title, { body, icon: "/favicon.ico" });
        }
      }
    }

    prevUnreadMapRef.current = next;
  }, [channels, currentUserId]);

  return null;
}
