"use client";

import React, { useCallback, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowDown, CalendarClock, CheckCheck, FileText, Forward, Link, ListPlus, Loader2, Lock, MessageSquare, Pencil, Pin, Smile, Ticket, Trash2 } from "lucide-react";
import { ReplyIcon, BookmarkCheckIcon, BookmarkPlusIcon, CopyIcon, Trash2Icon, UserPlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn, resolveImageUrl } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  getInitials,
  formatMessageTime,
  formatMessageTimeFull,
  formatFileSize,
  getFileExt,
  getFileColor,
  isImageMime,
  resolveFileUrl,
  getForwardedDisplay,
} from "./chat-helpers";
import type { Message, TicketEntityRef, CommentEntityRef, MessageMetadata } from "./chat-types";
import { useCan } from "@/hooks/api/access";
import { apiClient, isApiError } from "@/lib/api-client";
import { useEntityAction } from "./entity-actions-context";
import { useSubmitEntityAction } from "@/hooks/api/chat";
import { ConvertToTaskDialog } from "./convert-to-task-dialog";
import { EntityActionDialog } from "./entity-action-dialog";
import { ticketPermalinkQueryOptions } from "@/hooks/api/build/comment-permalink";
import { InternalLinkPreview } from "./internal-link-preview";
import { getStatusBadgeClass } from "@/features/build/shared/status-badge";
import { formatTicketKey } from "@/features/build/shared/format-ticket-key";
import { renderFormattedContent } from "./formatted-message-content";
import { TicketPill, CommentPill } from "./chat-entity-pills";
import { MessageActions } from "./chat-message-actions";

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
    userId: string,
    embedded?: { name?: string | null; email?: string | null } | null,
  ) => string;
}) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [dueDateDialogOpen, setDueDateDialogOpen] = useState(false);
  const bubbleMeta = message.metadata as MessageMetadata | null;
  const ticketEntity = (bubbleMeta?.entities ?? []).find(
    (e): e is TicketEntityRef => e.type === "ticket",
  );
  const ticketReference = {
    type: "ticket",
    id: ticketEntity ? String(ticketEntity.id) : "",
  };
  const canConvertToTask = useCan("build:tickets:create");
  const assignAction = useEntityAction(ticketReference, "assign");
  const canAssignTicket = Boolean(assignAction);
  const senderName = resolveUserName
    ? resolveUserName(message.senderId, message.sender)
    : (message.sender?.name ?? "Unknown");
  const replySenderName = message.replyTo
    ? resolveUserName
      ? resolveUserName(message.replyTo.sender?.id ?? "", message.replyTo.sender)
      : (message.replyTo.sender?.name ?? "Unknown")
    : null;
  const dueDateAction = useEntityAction(ticketReference, "due-date");
  const canSetDueDate = Boolean(dueDateAction);

  const handleOpenConvertDialog = useCallback(() => setConvertDialogOpen(true), []);
  const handleOpenAssignDialog = useCallback(() => setAssignDialogOpen(true), []);
  const handleOpenDueDateDialog = useCallback(() => setDueDateDialogOpen(true), []);

  const handleEditInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => onEditInputChange(e.target.value), [onEditInputChange]);
  const handleEditKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSaveEdit(); }
    if (e.key === "Escape") onCancelEdit();
  }, [onSaveEdit, onCancelEdit]);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content!);
    toast.success("Copied");
  }, [message.content]);
  const handleCopyLink = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("message", String(message.id));
    navigator.clipboard.writeText(url.toString());
    toast.success("Link copied");
  }, [message.id]);
  const handleToggleReactionPicker = useCallback(() => setShowReactionPicker((p) => !p), []);
  const handleQuickReact = useCallback((emoji: string) => {
    onReact(emoji);
    setShowReactionPicker(false);
  }, [onReact]);
  const handlePinToggle = useCallback(() => {
    if (isPinned) onUnpin();
    else onPin();
  }, [isPinned, onPin, onUnpin]);

  const meta = bubbleMeta;
  const linkedTicket =
    ticketEntity !== undefined
      ? { ticketId: Number(ticketEntity.id), projectId: ticketEntity.projectId }
      : null;
  const { label: forwardLabel, content: displayContent } = getForwardedDisplay(
    message.content,
    meta?.forwardCount,
  );

  if (message.isDeleted) {
    return (
      <div className={cn("flex mb-0.5 w-full min-w-0", isOwn ? "justify-end" : "justify-start", !isOwn && "ml-9")}>
        <div className="px-3 py-1 rounded-xl bg-muted/20 border border-border/15">
          <p className="text-dense text-muted-foreground/40 italic flex items-center gap-1.5">
            <Trash2 className="h-2.5 w-2.5" />
            Message deleted
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex gap-2 w-full min-w-0",
        isOwn ? "justify-end" : "justify-start",
        showSender ? "mt-3 mb-0.5" : "mb-0.5"
      )}
    >

      {!isOwn && (
        <div className="w-7 shrink-0 self-end">
          {showSender ? (
            <Avatar className="w-7 border border-border/30 shadow-sm">
              <AvatarImage src={resolveImageUrl(message.sender?.image)} />
              <AvatarFallback className="text-micro font-bold bg-muted text-muted-foreground">
                {getInitials(senderName)}
              </AvatarFallback>
            </Avatar>
          ) : <div className="w-7" />}
        </div>
      )}

      <div className={cn("min-w-0 max-w-[75%] sm:max-w-[65%] relative flex flex-col", isOwn ? "items-end" : "items-start")}>
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
            <TruncatedText text={replySenderName ?? ""} className={cn("font-bold", isOwn ? "text-primary-foreground" : "text-foreground")} />
            <p className={cn("truncate", isOwn ? "text-primary-foreground/70" : "text-muted-foreground")}>
              {message.replyTo.content
                ? renderFormattedContent(message.replyTo.content, isOwn)
                : null}
            </p>
          </div>
        )}

        {isEditing ? (
          <div className="mx-1">
            <div className="rounded-xl border border-primary/40 bg-background overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-ring/50">
              <textarea
                value={editInput}
                onChange={handleEditInputChange}
                onKeyDown={handleEditKeyDown}
                className="w-full bg-transparent text-sm resize-none px-3 py-2 focus:outline-none min-h-[40px]"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2 mt-1 px-1">
              <button onClick={onCancelEdit} className="text-dense text-muted-foreground hover:text-foreground">Cancel</button>
              <span className="text-muted-foreground/30">|</span>
              <button onClick={onSaveEdit} className="text-dense text-primary font-bold hover:underline">Save</button>
              <span className="text-micro text-muted-foreground/30 ml-auto hidden sm:inline">Esc / Enter</span>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "relative min-w-0 max-w-full px-3.5 py-2 shadow-sm",
              isOwn
                ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                : "bg-background border border-border text-foreground rounded-2xl rounded-bl-sm",
            )}
          >
            {forwardLabel && (
              <div
                className={cn(
                  "flex items-center gap-1 mb-1.5 text-dense font-medium italic",
                  isOwn ? "text-primary-foreground/85" : "text-muted-foreground",
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

            {message.content && /https?:\/\//.test(message.content) && (
              <InternalLinkPreview content={message.content} isOwn={isOwn} />
            )}

            {(() => {
              const meta = message.metadata as MessageMetadata | null;
              const entities = meta?.entities ?? [];
              const ticketEntities = entities.filter(
                (e): e is TicketEntityRef => e.type === "ticket",
              );
              const commentEntities = entities.filter(
                (e): e is CommentEntityRef => e.type === "comment",
              );
              if (ticketEntities.length === 0 && commentEntities.length === 0) return null;
              return (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {ticketEntities.map((entity) => (
                    <TicketPill key={entity.id} entity={entity} channelId={message.channelId} />
                  ))}
                  {commentEntities.map((entity) => (
                    <CommentPill key={entity.id} entity={entity} />
                  ))}
                </div>
              );
            })()}

            {message.attachments.length > 0 && (
              <div className="mt-1.5 space-y-1.5">
                {message.attachments.map((att) => {
                  const url = resolveFileUrl(att.fileUrl, att.mimeType);
                  return isImageMime(att.mimeType) ? (
                    <a
                      key={att.id}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg overflow-hidden"
                    >
                      <Image
                        src={url}
                        alt={att.fileName}
                        width={280}
                        height={200}
                        unoptimized
                        className="max-w-[280px] max-h-[200px] object-cover rounded-lg"
                      />
                    </a>
                  ) : (() => {
                    const colors = getFileColor(att.fileName);
                    return (
                      <a
                        key={att.id}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors min-w-0 max-w-full",
                          isOwn
                            ? "bg-primary-foreground/10 border-primary-foreground/15 hover:bg-primary-foreground/15"
                            : "bg-background border-border/50 hover:bg-muted/30 shadow-sm"
                        )}
                      >
                        <div className={cn(
                          "h-10 w-10 rounded-lg flex flex-col items-center justify-center shrink-0",
                          isOwn ? "bg-primary-foreground/15" : colors.bg
                        )}>
                          <FileText className={cn("h-4 w-4", isOwn ? "text-primary-foreground/80" : colors.text)} />
                          <span className={cn(
                            "text-micro font-bold px-1 rounded mt-0.5",
                            isOwn ? "bg-primary-foreground/25 text-primary-foreground" : cn("text-white", colors.badge)
                          )}>
                            {getFileExt(att.fileName)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <TruncatedText text={att.fileName} className="text-xs font-semibold" />
                          <p className={cn("text-micro mt-0.5", isOwn ? "text-primary-foreground/60" : "text-muted-foreground")}>
                            {formatFileSize(att.fileSize)} · {getFileExt(att.fileName)}
                          </p>
                        </div>
                        <ArrowDown className={cn("h-4 w-4 shrink-0", isOwn ? "text-primary-foreground/50" : "text-muted-foreground/50")} />
                      </a>
                    );
                  })();
                })}
              </div>
            )}

            <div className={cn("flex items-center gap-1.5 mt-1", isOwn ? "justify-end" : "justify-start")}>
              <span
                className={cn("text-dense font-medium", isOwn ? "text-primary-foreground/80" : "text-muted-foreground")}
                title={formatMessageTimeFull(message.createdAt)}
              >
                {formatMessageTime(message.createdAt)}
              </span>
              {message.isEdited && (
                <span className={cn("text-dense", isOwn ? "text-primary-foreground/60" : "text-muted-foreground/70")}>
                  edited
                </span>
              )}
              {isOwn && <CheckCheck className="h-3.5 w-3.5 text-primary-foreground/70" />}
            </div>
          </div>
        )}

        {replyCount !== undefined && replyCount > 0 && (
          <button
            onClick={onOpenThread}
            className={cn(
              "mt-1 px-1 flex items-center gap-1 text-dense font-medium text-primary hover:underline",
              isOwn ? "self-end" : "self-start"
            )}
          >
            <MessageSquare className="h-3 w-3" />
            {replyCount} {replyCount === 1 ? "reply" : "replies"}
          </button>
        )}

        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className={cn("flex flex-wrap gap-1 mt-1 px-1", isOwn ? "justify-end" : "justify-start")}>
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
                      : "bg-muted/40 border-border/30 hover:bg-muted/60"
                  )}
                >
                  <span>{emoji}</span>
                  <span className="font-medium text-dense">{userIds.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {canConvertToTask && (
          <ConvertToTaskDialog
            open={convertDialogOpen}
            onOpenChange={setConvertDialogOpen}
            channelId={message.channelId}
            messageId={message.id}
            defaultTitle={(message.content ?? "").slice(0, 80)}
          />
        )}
        {assignAction && (
          <EntityActionDialog
            open={assignDialogOpen}
            onOpenChange={setAssignDialogOpen}
            channelId={message.channelId}
            reference={ticketReference}
            action={assignAction}
          />
        )}
        {dueDateAction && (
          <EntityActionDialog
            open={dueDateDialogOpen}
            onOpenChange={setDueDateDialogOpen}
            channelId={message.channelId}
            reference={ticketReference}
            action={dueDateAction}
          />
        )}
        {!isEditing && (
          <MessageActions
            isOwn={isOwn}
            isPinned={isPinned}
            isSaved={isSaved}
            messageContent={message.content}
            showReactionPicker={showReactionPicker}
            onReply={onReply}
            onOpenThread={onOpenThread}
            onSave={onSave}
            onUnsave={onUnsaveMsg}
            onPinToggle={handlePinToggle}
            onToggleReactionPicker={handleToggleReactionPicker}
            onCopy={handleCopy}
            onCopyLink={handleCopyLink}
            onForward={onForward}
            canConvertToTask={canConvertToTask}
            onConvertToTask={handleOpenConvertDialog}
            canAssignTicket={canAssignTicket}
            onAssignTicket={handleOpenAssignDialog}
            canSetDueDate={canSetDueDate}
            onSetDueDate={handleOpenDueDateDialog}
            onStartEdit={onStartEdit}
            onDelete={onDelete}
            onQuickReact={handleQuickReact}
          />
        )}
      </div>
    </div>
  );
}
