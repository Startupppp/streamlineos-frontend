"use client";

import { cn } from "@/lib/utils";
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
import { TruncatedText } from "@/components/ui/truncated-text";

const ChannelItemMenu = dynamic(
  () =>
    import("./channel-item-menu").then((m) => ({ default: m.ChannelItemMenu })),
  { ssr: false, loading: () => null },
);

export function ChannelItem({
  channel,
  isActive,
  onClick,
  currentUserId,
  onlineUserIds,
  compact = false,
  tabIndex,
  onStartCall,
  onOpenSettings,
}: {
  channel: Channel;
  isActive: boolean;
  onClick: () => void;
  currentUserId: string;
  onlineUserIds: Set<string>;
  compact?: boolean;
  tabIndex?: number;
  onStartCall?: (channelId: number, type: "huddle") => void;
  onOpenSettings?: (channelId: number) => void;
}) {
  const otherMember =
    channel.type === "DIRECT"
      ? resolveDirectPartner(channel.members, currentUserId)
      : null;

  const displayName =
    channel.type === "DIRECT" ? (otherMember?.name ?? "Unknown") : channel.name;

  const isOnline =
    channel.type === "DIRECT" && otherMember
      ? onlineUserIds.has(otherMember.id)
      : false;

  const hasUnread = channel.unreadCount > 0 && !isActive;
  const preview = conversationPreview(channel);
  const rowLabel = conversationRowLabel(displayName, preview, channel.unreadCount, isActive, isOnline);

  if (compact) {
    return (
      <div className="relative flex justify-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              data-conversation-row="true"
              tabIndex={tabIndex}
              onClick={onClick}
              aria-current={isActive ? "true" : undefined}
              aria-label={rowLabel}
              className={cn(
                "relative flex size-11 items-center justify-center rounded-xl transition-colors duration-100",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-accent text-accent-foreground"
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
    <div className="group/item relative min-w-0">
      <button
        type="button"
        data-conversation-row="true"
        tabIndex={tabIndex}
        onClick={onClick}
        aria-current={isActive ? "true" : undefined}
        aria-label={rowLabel}
        className={cn(
          "flex min-h-14 w-full min-w-0 items-center gap-3 overflow-hidden rounded-xl px-2 py-2 text-left transition-colors duration-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isActive
            ? "bg-accent text-accent-foreground"
            : "hover:bg-muted",
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
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-status-success-fill" />
          )}
        </div>

        <div className="min-w-0 flex-1 pr-12">
          <div className="flex items-center justify-between gap-2">
            <TruncatedText
              text={displayName}
              className={cn(
                "text-label leading-tight text-foreground",
                hasUnread || isActive ? "font-semibold" : "font-medium",
              )}
            />
            {lastMessageTime && (
              <span className="shrink-0 text-dense tabular-nums text-muted-foreground">
                {lastMessageTime}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex min-w-0 items-center justify-between gap-2">
            <p
              className={cn(
                "min-w-0 flex-1 break-words text-dense leading-tight line-clamp-1",
                hasUnread || isActive ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {preview}
            </p>
            {hasUnread && (
              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 font-mono text-micro font-bold tabular-nums text-primary-foreground">
                {channel.unreadCount > 99 ? "99+" : channel.unreadCount}
              </span>
            )}
          </div>
        </div>
      </button>

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

function conversationPreview(channel: Channel): string {
  const content = channel.lastMessage?.content;
  if (!content) return "No messages yet";
  const sender =
    channel.type === "GROUP" ? channel.lastMessage?.senderName?.split(" ")[0] : undefined;
  return sender ? `${sender}: ${content}` : content;
}

function conversationRowLabel(
  displayName: string,
  preview: string,
  unreadCount: number,
  isActive: boolean,
  isOnline: boolean,
): string {
  const details = [displayName];
  if (isOnline) details.push("online");
  if (unreadCount > 0) {
    details.push(unreadCount === 1 ? "1 unread" : `${unreadCount} unread`);
  }
  if (isActive) details.push("selected");
  return `${details.join(", ")}. ${preview}`;
}
