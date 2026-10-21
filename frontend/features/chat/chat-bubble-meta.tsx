"use client";

import { CheckCheck, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/chat";
import { formatMessageTime, formatMessageTimeFull } from "./chat-helpers";

interface ChatBubbleMetaProps {
  message: Message;
  isOwn: boolean;
  isPinned?: boolean;
  isPendingSend: boolean;
}

export function ChatBubbleMeta({ message, isOwn, isPinned, isPendingSend }: ChatBubbleMetaProps) {
  const isDelivered = message.id > 0;
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 mt-1",
        isOwn ? "justify-end" : "justify-start",
      )}
    >
      <span
        className={cn(
          "text-dense font-medium",
          isOwn ? "text-primary-foreground/80" : "text-muted-foreground",
        )}
        title={formatMessageTimeFull(message.createdAt)}
      >
        {formatMessageTime(message.createdAt)}
      </span>
      {message.isEdited && (
        <span
          className={cn(
            "text-dense",
            isOwn ? "text-primary-foreground/60" : "text-muted-foreground",
          )}
        >
          edited
        </span>
      )}
      {isPendingSend && (
        <span className={cn("text-dense", isOwn ? "text-primary-foreground/80" : "text-muted-foreground")}>
          Sending…
        </span>
      )}
      {isOwn && isDelivered && (
        <CheckCheck
          className="h-3.5 w-3.5 text-primary-foreground/70"
          aria-label="Delivered"
          role="img"
        />
      )}
      {isPinned && isDelivered && (
        <Pin
          className={cn(
            "h-3 w-3",
            isOwn ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
          aria-label="Pinned message"
          role="img"
        />
      )}
    </div>
  );
}
