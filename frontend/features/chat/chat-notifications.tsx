"use client";

import { useEffect, useCallback } from "react";
import { useAbly } from "ably/react";
import type { InboundMessage } from "ably";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { MessageSquare, AtSign } from "lucide-react";

interface NotificationPayload {
  channelId: number;
  messageId: number;
  content: string | null;
  senderId: string;
  senderName: string;
  channelType?: string;
}

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
        icon: <AtSign className="h-4 w-4 text-blue-600" />,
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
    const ch = ably.channels.get(`notifications:${orgId}:${userId}`);
    ch.subscribe("notification:mention", handleMention);
    ch.subscribe("notification:message", handleMessage);
    return () => {
      ch.unsubscribe("notification:mention", handleMention);
      ch.unsubscribe("notification:message", handleMessage);
    };
  }, [ably, userId, orgId, handleMention, handleMessage]);

  return null;
}
