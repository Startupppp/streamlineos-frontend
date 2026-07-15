"use client";

import { useEffect, useCallback } from "react";
import { useAbly } from "ably/react";
import type { InboundMessage } from "ably";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { MessageSquare, AtSign } from "lucide-react";
import { safeSubscribe, safeUnsubscribe } from "@/lib/ably-safe-subscribe";

interface NotificationPayload {
  channelId: number;
  messageId: number;
  content: string | null;
  senderId: string;
  senderName: string;
  channelType?: string;
}

type NotificationEvent = "notification:mention" | "notification:message";

const NOTIFICATION_EVENTS: NotificationEvent[] = [
  "notification:mention",
  "notification:message",
];

export function ChatNotificationsProvider({
  onSelectChannel,
}: {
  onSelectChannel: (channelId: number) => void;
}) {
  const { data: session } = useSession();
  const ably = useAbly();
  const userId = session?.user?.id;
  const orgId = session?.orgId;

  const handleMention = useCallback((msg: InboundMessage) => {
    const data = msg.data as NotificationPayload;
    toast(
      `${data.senderName} mentioned you`,
      {
        description: data.content?.slice(0, 80),
        icon: <AtSign className="h-4 w-4 text-primary" />,
        action: {
          label: "Jump",
          onClick: () => onSelectChannel(data.channelId),
        },
      }
    );
  }, [onSelectChannel]);

  const handleMessage = useCallback((msg: InboundMessage) => {
    const data = msg.data as NotificationPayload;
    if (data.channelType !== "DIRECT") return;
    toast(
      `New message from ${data.senderName}`,
      {
        description: data.content?.slice(0, 80),
        icon: <MessageSquare className="h-4 w-4 text-muted-foreground" />,
        action: {
          label: "View",
          onClick: () => onSelectChannel(data.channelId),
        },
        duration: 4000,
      }
    );
  }, [onSelectChannel]);

  useEffect(() => {
    if (!userId || !orgId) return;
    if (ably.connection.state === "closed" || ably.connection.state === "failed") return;

    const ch = ably.channels.get(`notifications:${orgId}:${userId}`);
    let cancelled = false;
    const subscribed: NotificationEvent[] = [];
    const handlers: Record<NotificationEvent, (msg: InboundMessage) => void> = {
      "notification:mention": handleMention,
      "notification:message": handleMessage,
    };

    async function setup() {
      try {
        if (ably.connection.state !== "connected") {
          await ably.connection.whenState("connected");
        }
        if (cancelled) return;

        for (const event of NOTIFICATION_EVENTS) {
          if (cancelled) return;
          const listener = handlers[event];
          const ok = await safeSubscribe(ch, event, listener);
          if (cancelled) {
            if (ok) safeUnsubscribe(ch, event, listener);
            return;
          }
          if (ok) subscribed.push(event);
        }
      } catch {
        return;
      }
    }

    void setup();

    return () => {
      cancelled = true;
      for (const event of subscribed) {
        safeUnsubscribe(ch, event, handlers[event]);
      }
    };
  }, [ably, userId, orgId, handleMention, handleMessage]);

  return null;
}
