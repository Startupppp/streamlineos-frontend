"use client";

import { useCallback, useEffect, useState } from "react";
import { useAbly } from "ably/react";
import type { InboundMessage } from "ably";
import { useSession } from "next-auth/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AtSign, Bell, MessageSquare, Volume2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface NotificationItem {
  id: string;
  type: "mention" | "message" | "huddle";
  channelId: number;
  messageId?: number;
  senderName: string;
  content: string | null;
  channelName?: string;
  createdAt: Date;
  read: boolean;
}

export function NotificationCenter({
  onClose,
  onSelectChannel,
}: {
  onClose: () => void;
  onSelectChannel: (channelId: number) => void;
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const { data: session } = useSession();
  const ably = useAbly();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const orgId = (session as { orgId?: string } | null)?.orgId;

  useEffect(() => {
    if (!userId || !orgId) return;
    const ch = ably.channels.get(`notifications:${orgId}:${userId}`);

    const handleMention = (msg: InboundMessage) => {
      const data = msg.data as { channelId: number; messageId: number; senderName: string; content: string | null };
      setNotifications(prev => [{
        id: `${Date.now()}-mention`,
        type: "mention" as const,
        channelId: data.channelId,
        messageId: data.messageId,
        senderName: data.senderName,
        content: data.content,
        createdAt: new Date(),
        read: false,
      }, ...prev].slice(0, 50));
    };

    const handleMessage = (msg: InboundMessage) => {
      const data = msg.data as { channelId: number; messageId: number; senderName: string; content: string | null; channelType?: string };
      setNotifications(prev => [{
        id: `${Date.now()}-message`,
        type: "message" as const,
        channelId: data.channelId,
        messageId: data.messageId,
        senderName: data.senderName,
        content: data.content,
        createdAt: new Date(),
        read: false,
      }, ...prev].slice(0, 50));
    };

    const handleHuddle = (msg: InboundMessage) => {
      const data = msg.data as { channelId: number; startedBy: string };
      setNotifications(prev => [{
        id: `${Date.now()}-huddle`,
        type: "huddle" as const,
        channelId: data.channelId,
        senderName: data.startedBy,
        content: "started a huddle",
        createdAt: new Date(),
        read: false,
      }, ...prev].slice(0, 50));
    };

    ch.subscribe("notification:mention", handleMention);
    ch.subscribe("notification:message", handleMessage);
    ch.subscribe("huddle:started", handleHuddle);

    return () => {
      ch.unsubscribe("notification:mention", handleMention);
      ch.unsubscribe("notification:message", handleMessage);
      ch.unsubscribe("huddle:started", handleHuddle);
    };
  }, [ably, userId, orgId]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const handleSelect = useCallback((notif: NotificationItem) => {
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    onSelectChannel(notif.channelId);
  }, [onSelectChannel]);

  const getIcon = (type: NotificationItem["type"]) => {
    if (type === "mention") return <AtSign className="h-3.5 w-3.5 text-blue-600" />;
    if (type === "huddle") return <Volume2 className="h-3.5 w-3.5 text-emerald-500" />;
    return <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  return (
    <div className="flex flex-col h-full w-80 border-l border-border/40 bg-card/50">
      <div className="h-[56px] px-4 border-b border-border/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-[14px] font-bold">Notifications</h3>
          {unreadCount > 0 && (
            <span className="h-5 min-w-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center px-1.5">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-[11px] text-blue-600 hover:underline px-1">
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg" aria-label="Close">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
              <Bell className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <h4 className="text-[13px] font-semibold mb-1">All caught up</h4>
            <p className="text-[11px] text-muted-foreground text-center">Notifications appear here in real time.</p>
          </div>
        ) : (
          <div>
            {notifications.map(notif => (
              <button
                key={notif.id}
                onClick={() => handleSelect(notif)}
                className={cn(
                  "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-border/20 last:border-0",
                  notif.read ? "hover:bg-muted/30" : "bg-blue-500/5 hover:bg-blue-500/8",
                )}
              >
                <div className={cn(
                  "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                  notif.type === "mention" ? "bg-blue-500/10" : notif.type === "huddle" ? "bg-emerald-500/10" : "bg-muted",
                )}>
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5 mb-0.5">
                    <span className="text-[12px] font-bold text-foreground">{notif.senderName}</span>
                    {!notif.read && <div className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{notif.content}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {formatDistanceToNow(notif.createdAt, { addSuffix: true })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
