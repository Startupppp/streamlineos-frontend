"use client";

import { useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Hash, MoreHorizontal, LogOut, Trash2 } from "lucide-react";
import { cn, resolveImageUrl } from "@/lib/utils";
import { getInitials, formatChannelTime } from "./chat-helpers";
import type { Channel } from "./chat-types";

export function ChannelItem({
  channel,
  isActive,
  onClick,
  currentUserId,
  onlineUserIds,
  onLeave,
  onDelete,
}: {
  channel: Channel;
  isActive: boolean;
  onClick: () => void;
  currentUserId: string;
  onlineUserIds: Set<string>;
  onLeave?: (channelId: number) => void;
  onDelete?: (channelId: number) => void;
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

  const hasUnread = channel.unreadCount > 0;

  const isAdmin = Boolean(
    channel.members?.some(
      (m) => m.user?.id === currentUserId && m.role === "ADMIN"
    )
  );

  const handleLeave = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onLeave?.(channel.id);
    },
    [channel.id, onLeave]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete?.(channel.id);
    },
    [channel.id, onDelete]
  );

  return (
    <div
      className={cn(
        "group/channel w-full flex items-center gap-2.5 px-2 py-2 rounded-xl transition-all duration-100",
        isActive ? "bg-gold/10 shadow-sm" : "hover:bg-muted/40",
        hasUnread && !isActive && "text-foreground"
      )}
    >
      <button
        onClick={onClick}
        className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
      >
        <div className="relative shrink-0">
          {channel.type === "DIRECT" ? (
            <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
              <AvatarImage src={resolveImageUrl(otherMember?.image)} />
              <AvatarFallback className="text-[11px] font-semibold bg-gradient-to-br from-gold/20 to-gold/5 text-gold">
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
              <span className="h-[18px] min-w-[18px] flex items-center justify-center bg-gold text-white text-[10px] font-bold rounded-full px-1 shrink-0">
                {channel.unreadCount > 99 ? "99+" : channel.unreadCount}
              </span>
            )}
          </div>
        </div>
      </button>

      {onLeave && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="opacity-0 group-hover/channel:opacity-100 shrink-0 p-1 rounded-md hover:bg-muted/60 text-muted-foreground transition-opacity"
              aria-label="Channel options"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {channel.type === "DIRECT" ? (
              <DropdownMenuItem
                onClick={handleLeave}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Conversation
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem
                  onClick={handleLeave}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Leave Group
                </DropdownMenuItem>
                {isAdmin && onDelete && (
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Group
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
