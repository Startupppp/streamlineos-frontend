"use client";

import { Forward, MessageSquare, Trash2 } from "lucide-react";
import { cn, resolveImageUrl } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getForwardedDisplay } from "./chat-helpers";
import type { Message } from "@/types/chat";
import { ChatBubbleAttachments } from "./chat-bubble-attachments";
import { ChatBubbleActions } from "./chat-bubble-actions";
import { ChatBubbleEditForm } from "./chat-bubble-edit-form";
import { ChatBubbleFailedSend, useFailedSend } from "./chat-bubble-failed-send";
import { ChatBubbleMeta } from "./chat-bubble-meta";
import { renderFormattedContent } from "./formatted-message-content";
import { getInitials } from "@/lib/format-utils";

export function ChatBubble({
  message,
  isOwn,
  showSender,
  isEditing,
  editInput,
  currentUserId,
  isPinned,
  replyCount,
  onEditInputChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onReply,
  onOpenThread,
  onDelete,
  onReact,
  onPin,
  onUnpin,
  isSaved,
  onSave,
  onUnsaveMsg,
  onForward,
  resolveUserName,
}: {
  message: Message;
  isOwn: boolean;
  showSender: boolean;
  isEditing: boolean;
  editInput: string;
  currentUserId: string;
  isPinned?: boolean;
  replyCount?: number;
  onEditInputChange: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onReply: () => void;
  onOpenThread: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
  onPin: () => void;
  onUnpin: () => void;
  isSaved?: boolean;
  onSave?: () => void;
  onUnsaveMsg?: () => void;
  onForward?: () => void;
  resolveUserName?: (
    userId: string | null,
    embedded?: { name?: string | null; email?: string | null } | null,
  ) => string;
}) {
  const bubbleMeta = message.metadata;
  const senderName = resolveUserName
    ? resolveUserName(message.senderId, message.sender)
    : (message.sender?.name ?? "Unknown");
  const replySenderName = message.replyTo
    ? resolveUserName
      ? resolveUserName(
          message.replyTo.sender?.id ?? "",
          message.replyTo.sender,
        )
      : (message.replyTo.sender?.name ?? "Unknown")
    : null;
  const isFailedSend = useFailedSend(message);
  const isPendingSend = message.id < 0 && !isFailedSend;

  const { label: forwardLabel, content: displayContent } = getForwardedDisplay(
    message.content,
    bubbleMeta?.forwardCount,
  );

  if (message.isDeleted) {
    return (
      <div
        className={cn(
          "flex mb-0.5 w-full min-w-0",
          isOwn ? "justify-end" : "justify-start",
          !isOwn && "ml-9",
        )}
      >
        <div className="px-3 py-1 rounded-xl bg-muted/20 border border-border/15">
          <p className="text-dense text-muted-foreground italic flex items-center gap-1.5">
            <Trash2 className="h-2.5 w-2.5" />
            Message deleted
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`message-${message.id}`}
      data-pending={isPendingSend ? "true" : undefined}
      aria-busy={isPendingSend || undefined}
      className={cn(
        "group flex gap-2 w-full min-w-0",
        isOwn ? "justify-end" : "justify-start",
        showSender ? "mt-3 mb-0.5" : "mb-0.5",
        isPendingSend && "opacity-60",
      )}
    >
      {!isOwn && (
        <div className="w-7 shrink-0 self-end">
          {showSender ? (
            <Avatar className="w-7 border border-border/30 shadow-sm">
              <AvatarImage src={resolveImageUrl(message.sender?.image)} />
              <AvatarFallback className="text-micro font-bold bg-muted text-foreground">
                {getInitials(senderName)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-7" />
          )}
        </div>
      )}

      <div
        className={cn(
          "min-w-0 max-w-[75%] sm:max-w-[65%] relative flex flex-col",
          isOwn ? "items-end" : "items-start",
        )}
      >
        {showSender && !isOwn && (
          <p className="text-dense font-bold text-blue mb-1 px-1 ml-1">
            {senderName}
          </p>
        )}

        {message.replyTo && (
          <div
            className={cn(
              "mx-1 mb-0.5 min-w-0 max-w-full px-2.5 py-1.5 rounded-lg border text-dense",
              isOwn
                ? "bg-primary-foreground/10 border-primary-foreground/15"
                : "bg-muted/50 border-border/40",
            )}
          >
            <TruncatedText
              text={replySenderName ?? ""}
              className={cn(
                "font-bold",
                isOwn ? "text-primary-foreground" : "text-foreground",
              )}
            />
            <p
              className={cn(
                "truncate",
                isOwn ? "text-primary-foreground/70" : "text-muted-foreground",
              )}
            >
              {message.replyTo.content
                ? renderFormattedContent(message.replyTo.content, isOwn)
                : null}
            </p>
          </div>
        )}

        {isEditing ? (
          <ChatBubbleEditForm
            editInput={editInput}
            onEditInputChange={onEditInputChange}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
          />
        ) : (
          <div
            className={cn(
              "relative min-w-0 max-w-full px-3.5 py-2 shadow-sm",
              isOwn
                ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                : "bg-card border border-border text-card-foreground rounded-2xl rounded-bl-sm",
            )}
          >
            {forwardLabel && (
              <div
                className={cn(
                  "flex items-center gap-1 mb-1.5 text-dense font-medium italic",
                  isOwn
                    ? "text-primary-foreground/85"
                    : "text-muted-foreground",
                )}
              >
                <Forward className="h-3 w-3 shrink-0" />
                <span>{forwardLabel}</span>
              </div>
            )}

            {displayContent && (
              <div className="min-w-0 text-sm leading-[1.55] break-words break-all">
                {renderFormattedContent(displayContent, isOwn)}
              </div>
            )}

            <ChatBubbleAttachments
              message={message}
              metadata={bubbleMeta}
              isOwn={isOwn}
            />

            <ChatBubbleMeta
              message={message}
              isOwn={isOwn}
              isPinned={isPinned}
              isPendingSend={isPendingSend}
            />
          </div>
        )}

        {isFailedSend && message.clientKey && (
          <ChatBubbleFailedSend channelId={message.channelId} clientKey={message.clientKey} />
        )}

        {replyCount !== undefined && replyCount > 0 && (
          <button
            onClick={onOpenThread}
            className={cn(
              "mt-1 px-1 flex items-center gap-1 text-dense font-medium text-primary hover:underline",
              isOwn ? "self-end" : "self-start",
            )}
          >
            <MessageSquare className="h-3 w-3" />
            {replyCount} {replyCount === 1 ? "reply" : "replies"}
          </button>
        )}

        {message.id > 0 && message.reactions && Object.keys(message.reactions).length > 0 && (
          <div
            className={cn(
              "flex flex-wrap gap-1 mt-1 px-1",
              isOwn ? "justify-end" : "justify-start",
            )}
          >
            {Object.entries(message.reactions).map(([emoji, userIds]) => {
              const hasReacted = userIds.includes(currentUserId);
              const handleReactClick = () => onReact(emoji);
              return (
                <button
                  key={emoji}
                  onClick={handleReactClick}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs transition-colors",
                    hasReacted
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-muted/40 border-border/30 hover:bg-muted/60",
                  )}
                >
                  <span>{emoji}</span>
                  <span className="font-medium text-dense">
                    {userIds.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {message.id > 0 && (
          <ChatBubbleActions
            message={message}
            senderName={senderName}
            isOwn={isOwn}
            isPinned={isPinned}
            isSaved={isSaved}
            isEditing={isEditing}
            onStartEdit={onStartEdit}
            onReply={onReply}
            onOpenThread={onOpenThread}
            onDelete={onDelete}
            onReact={onReact}
            onPin={onPin}
            onUnpin={onUnpin}
            onSave={onSave}
            onUnsaveMsg={onUnsaveMsg}
            onForward={onForward}
          />
        )}
      </div>
    </div>
  );
}
