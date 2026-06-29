"use client";

import { useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BellOff, Hash } from "lucide-react";
import { cn, resolveImageUrl } from "@/lib/utils";
import { getInitials, formatChannelTime } from "./chat-helpers";
import type { Channel } from "./chat-types";
import { useMarkChannelUnread } from "@/hooks/api";

export function ChannelItem({
  channel,
  isActive,
  onClick,
  currentUserId,
  onlineUserIds,
}: {
  channel: Channel;
  isActive: boolean;
  onClick: () => void;
  currentUserId: string;
  onlineUserIds: Set<string>;
}) {
  const otherMember =
    channel.type === "DIRECT"
      ? channel.members?.find((m) => m.user?.id !== currentUserId)?.user
      : null;

  const displayName =
    channel.type === "DIRECT" ? otherMember?.name ?? "Unknown" : channel.name;

  const isOnline =
    channel.type === "DIRECT" && otherMember
      ? onlineUserIds.has(otherMember.id)
      : false;

  const hasUnread = channel.unreadCount > 0 && !isActive;
  const markUnread = useMarkChannelUnread();

  const handleMarkUnread = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    markUnread.mutate(channel.id);
  }, [markUnread, channel.id]);

  return (
    <div className="relative group/item">
      <button
        onClick={onClick}
        className={cn(
          "w-full flex items-center gap-2.5 px-2 py-2 rounded-xl text-left transition-all duration-100 group",
          isActive
            ? "bg-blue-500/10 shadow-sm"
            : "hover:bg-muted/40",
          hasUnread && !isActive && "text-foreground"
        )}
      >
        <div className="relative shrink-0">
          {channel.type === "DIRECT" ? (
            <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
              <AvatarImage src={resolveImageUrl(otherMember?.image)} />
              <AvatarFallback className="text-[11px] font-semibold bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-600">
                {getInitials(otherMember?.name)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue/10 to-blue/5 flex items-center justify-center border-2 border-background shadow-sm">
              <Hash className="h-4 w-4 text-blue" />
            </div>
          )}
          {isOnline && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5">
            <p
              className={cn(
                "text-[13px] truncate leading-tight",
                hasUnread || isActive ? "font-bold text-foreground" : "font-medium text-muted-foreground"
              )}
            >
              {displayName}
            </p>
            {channel.lastMessage?.createdAt && (
              <span className="text-[11px] text-muted-foreground shrink-0">
                {formatChannelTime(channel.lastMessage.createdAt)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-1.5 mt-0.5">
            <p className="text-[11px] text-muted-foreground/60 truncate leading-tight">
              {channel.lastMessage?.content
                ? `${channel.type === "GROUP" ? `${channel.lastMessage.senderName?.split(" ")[0]}: ` : ""}${channel.lastMessage.content}`
                : "No messages yet"}
            </p>
            {hasUnread && (
              <span className="h-[18px] min-w-[18px] flex items-center justify-center bg-blue-500 text-white text-[10px] font-bold rounded-full px-1 shrink-0">
                {channel.unreadCount > 99 ? "99+" : channel.unreadCount}
              </span>
            )}
          </div>
        </div>
      </button>
      <button
        onClick={handleMarkUnread}
        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted/60 text-muted-foreground/60 hover:text-foreground z-10"
        title="Mark as unread"
        aria-label="Mark as unread"
      >
        <BellOff className="h-3 w-3" />
      </button>
    </div>
  );
}
