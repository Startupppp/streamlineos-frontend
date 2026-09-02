"use client";

import { cn, resolveImageUrl } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials, formatMessageTime } from "./chat-helpers";
import { renderFormattedContent } from "./formatted-message-content";
import type { Message } from "@/types/chat";

interface ThreadMessageProps {
  message: Message;
  currentUserId: string;
  isParent?: boolean;
  resolveUserName: (
    userId: string,
    embedded?: { name?: string | null; email?: string | null } | null,
  ) => string;
}

export function ThreadMessage({ message, currentUserId, isParent, resolveUserName }: ThreadMessageProps) {
  const isOwn = message.senderId === currentUserId;
  const senderName = resolveUserName(message.senderId, message.sender);
  if (message.isDeleted) {
    return (
      <div className="px-3 py-1 rounded-xl bg-muted/20 border border-border/15 mx-4">
        <p className="text-dense text-muted-foreground/40 italic">Message deleted</p>
      </div>
    );
  }
  return (
    <div className={cn("flex gap-2.5 px-4", isParent ? "py-3" : "py-1")}>
      <Avatar className="w-7 shrink-0 mt-0.5 border border-border/30 shadow-sm">
        <AvatarImage src={resolveImageUrl(message.sender?.image)} />
        <AvatarFallback className="text-micro font-bold bg-muted text-muted-foreground">
          {getInitials(senderName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className={cn("text-xs font-bold", isOwn ? "text-primary" : "text-foreground")}>
            {senderName}
          </span>
          <span className="text-micro text-muted-foreground">
            {formatMessageTime(message.createdAt)}
          </span>
          {message.isEdited && (
            <span className="text-micro text-muted-foreground/60">edited</span>
          )}
        </div>
        {message.content && (
          <div className="text-label leading-[1.55] whitespace-pre-wrap break-words text-foreground">
            {renderFormattedContent(message.content, isOwn)}
          </div>
        )}
        {message.attachments.length > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {message.attachments.length} attachment{message.attachments.length !== 1 ? "s" : ""}
          </p>
        )}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(message.reactions).map(([emoji, userIds]) => (
              <span
                key={emoji}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full border text-dense bg-muted/40 border-border/30"
              >
                {emoji}
                <span className="font-medium">{userIds.length}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

