"use client";

import { useCallback } from "react";
import { CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatChannelTime } from "./chat-helpers";
import type { Channel } from "./chat-types";
import { ChannelAvatar } from "./channel-avatar";
import { resolveDirectPartner } from "./channel-member-lookup";
import dynamic from "next/dynamic";
import { useMarkChannelUnread } from "@/hooks/api/chat-personal-b";
import { TruncatedText } from "@/components/ui/truncated-text";

/**
 * The per-row overflow menu, and the add-members dialog it owns, are behind a
 * click. Loading them eagerly put both in the first-load chunk of every route
 * that renders a channel list, because `channel-item` renders once per channel.
 * `loading: null` costs nothing here: the trigger sits in a hover-revealed
 * cluster, so there is no layout box to reserve and nothing visible to flash.
 */
const ChannelItemMenu = dynamic(
  () => import("./channel-item-menu").then((m) => ({ default: m.ChannelItemMenu })),
  { ssr: false, loading: () => null },
);

export function ChannelItem({
  channel,
  isActive,
  onClick,
  currentUserId,
  onlineUserIds,
  compact = false,
  onStartCall,
  onOpenSettings,
}: {
  channel: Channel;
  isActive: boolean;
  onClick: () => void;
  currentUserId: string;
  onlineUserIds: Set<string>;
  compact?: boolean;
  onStartCall?: (channelId: number, type: "huddle") => void;
  onOpenSettings?: (channelId: number) => void;
}) {
  const otherMember =
    channel.type === "DIRECT" ? resolveDirectPartner(channel.members, currentUserId) : null;

  const displayName =
    channel.type === "DIRECT" ? otherMember?.name ?? "Unknown" : channel.name;

  const isOnline =
    channel.type === "DIRECT" && otherMember
      ? onlineUserIds.has(otherMember.id)
      : false;

  const hasUnread = channel.unreadCount > 0 && !isActive;
  const markUnread = useMarkChannelUnread();

  const handleMarkUnread = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await markUnread.mutateAsync(channel.id);
        toast.success("Marked as unread");
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [markUnread, channel.id],
  );

  if (compact) {
    return (
      <div className="relative flex justify-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onClick}
              aria-label={displayName}
              className={cn(
                "relative flex items-center justify-center rounded-xl p-1 transition-colors duration-100",
                isActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <ChannelAvatar
                type={channel.type}
                name={channel.name}
                avatarUrl={channel.avatarUrl}
                otherMember={otherMember}
                className="size-8"
                iconClassName="h-3.5 w-3.5"
              />
              {isOnline && (
                <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-status-success-fill border-2 border-background" />
              )}
              {hasUnread && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {displayName}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  const lastMessageTime = channel.lastMessage?.createdAt
    ? formatChannelTime(channel.lastMessage.createdAt)
    : null;

  return (
    <div className="relative group/item min-w-0">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full min-w-0 overflow-hidden flex items-center gap-2.5 px-2 py-2 rounded-xl text-left transition-colors duration-100",
          isActive
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          hasUnread && !isActive && "text-foreground",
        )}
      >
        <div className="relative shrink-0">
          <ChannelAvatar
            type={channel.type}
            name={channel.name}
            avatarUrl={channel.avatarUrl}
            otherMember={otherMember}
            className="h-10 w-10"
          />
          {isOnline && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-status-success-fill border-2 border-background" />
          )}
        </div>

        <div className="flex-1 min-w-0 pr-8">
          <div className="flex items-center justify-between gap-2">
            <TruncatedText
              text={displayName}
              className={cn(
                "text-label leading-tight",
                hasUnread || isActive
                  ? "font-bold text-foreground"
                  : "font-medium text-muted-foreground",
              )}
            />

            {lastMessageTime && (
              <span
                className={cn(
                  "text-dense text-muted-foreground tabular-nums shrink-0 transition-opacity duration-150",
                  !hasUnread && "group-hover/item:opacity-0",
                )}
              >
                {lastMessageTime}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-1.5 mt-0.5 min-w-0">
            <p className="min-w-0 flex-1 text-dense text-muted-foreground/60 line-clamp-1 break-all break-words leading-tight">
              {channel.lastMessage?.content
                ? `${channel.type === "GROUP" ? `${channel.lastMessage.senderName?.split(" ")[0]}: ` : ""}${channel.lastMessage.content}`
                : "No messages yet"}
            </p>
            {hasUnread && (
              <span className="h-[18px] min-w-[18px] flex items-center justify-center bg-primary text-primary-foreground text-micro font-bold rounded-full px-1 shrink-0 transition-opacity duration-150 group-hover/item:opacity-0">
                {channel.unreadCount > 99 ? "99+" : channel.unreadCount}
              </span>
            )}
          </div>
        </div>
      </button>

      {!hasUnread && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleMarkUnread}
              aria-label="Mark as unread"
              className={cn(
                "absolute right-8 top-[11px] z-10",
                "h-6 w-6 flex items-center justify-center rounded-md",
                "text-muted-foreground hover:text-foreground hover:bg-background/90",
                "opacity-0 pointer-events-none group-hover/item:opacity-100 group-hover/item:pointer-events-auto",
                "transition-all duration-150",
              )}
            >
              <CircleDot className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs px-2 py-1">
            Mark as unread
          </TooltipContent>
        </Tooltip>
      )}

      {onStartCall && onOpenSettings && (
        <ChannelItemMenu
          channel={channel}
          currentUserId={currentUserId}
          onStartCall={onStartCall}
          onOpenSettings={onOpenSettings}
        />
      )}
    </div>
  );
}
