"use client";

import React, { useCallback, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowDown, CalendarClock, CheckCheck, FileText, Forward, Link, ListPlus, Loader2, MessageSquare, Pencil, Pin, Smile, Ticket, Trash2 } from "lucide-react";
import { ReplyIcon, BookmarkCheckIcon, BookmarkPlusIcon, CopyIcon, Trash2Icon, UserPlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/utils";
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
import { ConvertToTaskDialog } from "./convert-to-task-dialog";
import { AssignTicketDialog } from "./assign-ticket-dialog";
import { SetDueDateDialog } from "./set-due-date-dialog";
import { ticketPermalinkQueryOptions } from "@/hooks/api/projects/comment-permalink";
import { InternalLinkPreview } from "./internal-link-preview";
import { getStatusBadgeClass } from "@/features/projects/shared/status-badge";
import { formatTicketKey } from "@/features/projects/shared/format-ticket-key";
import { renderFormattedContent } from "./formatted-message-content";

const ReplyButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  function ReplyButton({ className, ...props }, ref) {
    const { iconRef, hoverHandlers } = useAnimatedIcon();
    return (
      <button ref={ref} {...hoverHandlers} className={className} {...props}>
        <ReplyIcon ref={iconRef} size={14} />
      </button>
    );
  },
);

const SaveButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { isSaved: boolean }>(
  function SaveButton({ className, isSaved, ...props }, ref) {
    const { iconRef, hoverHandlers } = useAnimatedIcon();
    return (
      <button ref={ref} {...hoverHandlers} className={className} {...props}>
        {isSaved ? (
          <BookmarkCheckIcon ref={iconRef} size={14} className="fill-amber-500" />
        ) : (
          <BookmarkPlusIcon ref={iconRef} size={14} />
        )}
      </button>
    );
  },
);

const CopyButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  function CopyButton({ className, ...props }, ref) {
    const { iconRef, hoverHandlers } = useAnimatedIcon();
    return (
      <button ref={ref} {...hoverHandlers} className={className} {...props}>
        <CopyIcon ref={iconRef} size={14} />
      </button>
    );
  },
);

const DeleteButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  function DeleteButton({ className, ...props }, ref) {
    const { iconRef, hoverHandlers } = useAnimatedIcon();
    return (
      <button ref={ref} {...hoverHandlers} className={className} {...props}>
        <Trash2Icon ref={iconRef} size={14} />
      </button>
    );
  },
);

const UserPlusButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  function UserPlusButton({ className, ...props }, ref) {
    const { iconRef, hoverHandlers } = useAnimatedIcon();
    return (
      <button ref={ref} {...hoverHandlers} className={className} {...props}>
        <UserPlusIcon ref={iconRef} size={14} />
      </button>
    );
  },
);

const TICKET_STATUS_DISPLAY: Record<string, string> = {
  TODO: "Todo",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

function TicketPill({ entity, channelId }: { entity: TicketEntityRef; channelId: number }) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(entity.status ?? "TODO");
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const canUpdate = useCan("projects:tickets:update");

  const hasFullInfo = Boolean(entity.projectKey && entity.ticketNumber);
  const ticketKey = hasFullInfo
    ? `${entity.projectKey}-${entity.ticketNumber}`
    : `Ticket #${entity.id}`;

  const handlePillClick = useCallback(() => {
    router.push(`/projects/${entity.projectId}?ticket=${entity.id}`);
  }, [router, entity.projectId, entity.id]);

  const handleStatusChange = useCallback(
    async (nextStatus: string) => {
      const prev = currentStatus;
      setCurrentStatus(nextStatus);
      setIsChangingStatus(true);
      try {
        await apiClient.post("/chat/actions/ticket-status", {
          channelId,
          projectId: entity.projectId,
          ticketId: Number(entity.id),
          nextStatus,
        });
      } catch (err) {
        setCurrentStatus(prev);
        const code = isApiError(err) ? err.code : undefined;
        if (code === "CHAT_ACTION_FORBIDDEN") {
          toast.error("You don't have permission to change this ticket's status.");
        } else if (code === "PROJECTS_TICKET_NOT_FOUND") {
          toast.error("This ticket no longer exists.");
        } else if (code === "CHAT_ACTION_TICKET_STATUS_FAILED") {
          toast.error("This status change isn't allowed.");
        } else {
          toast.error("Failed to update ticket status");
        }
      } finally {
        setIsChangingStatus(false);
      }
    },
    [currentStatus, channelId, entity],
  );

  if (!hasFullInfo) {
    return (
      <div className="inline-flex items-center rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 hover:border-border/80 transition-all duration-150 ease-out motion-reduce:transition-none my-1">
        <button
          type="button"
          onClick={handlePillClick}
          className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground"
          aria-label={`Open ${ticketKey}`}
        >
          <Ticket className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          {ticketKey}
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 hover:border-border/80 transition-all duration-150 ease-out motion-reduce:transition-none my-1">
      <button
        type="button"
        onClick={handlePillClick}
        className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground shrink-0"
        aria-label={`Open ticket ${ticketKey}`}
      >
        <Ticket className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        {ticketKey}
      </button>
      {entity.title && (
        <button
          type="button"
          onClick={handlePillClick}
          className="text-[12px] text-foreground/80 hover:underline max-w-[160px] min-w-0"
        >
          <TruncatedText text={entity.title} />
        </button>
      )}
      {canUpdate ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={isChangingStatus}
              className={cn(
                "inline-flex items-center rounded px-1.5 py-px text-[10px] font-medium cursor-pointer hover:opacity-80 transition-opacity duration-150 ease-out motion-reduce:transition-none",
                getStatusBadgeClass(currentStatus),
              )}
              aria-label="Change ticket status"
            >
              {isChangingStatus ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                TICKET_STATUS_DISPLAY[currentStatus] ?? currentStatus
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            {(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const).map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => handleStatusChange(s)}
                className={cn(s === currentStatus && "font-semibold")}
              >
                {TICKET_STATUS_DISPLAY[s]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span
          className={cn(
            "inline-flex items-center rounded px-1.5 py-px text-[10px] font-medium",
            getStatusBadgeClass(currentStatus),
          )}
        >
          {TICKET_STATUS_DISPLAY[currentStatus] ?? currentStatus}
        </span>
      )}
    </div>
  );
}

function CommentPill({ entity }: { entity: CommentEntityRef }) {
  const router = useRouter();
  const { data: ticket } = useQuery(
    ticketPermalinkQueryOptions(entity.projectId, entity.ticketId),
  );

  const href = `/projects/${entity.projectId}?ticket=${entity.ticketId}&comment=${entity.id}`;
  const label = ticket
    ? `Comment on ${formatTicketKey(ticket.projectKey, ticket.ticketNumber)}`
    : "Comment";

  const handleClick = useCallback(() => {
    router.push(href);
  }, [router, href]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-2 py-1 shadow-sm hover:shadow-md transition-all duration-150 ease-out motion-reduce:transition-none text-[11px] text-muted-foreground hover:text-foreground my-1"
      aria-label={label}
    >
      <MessageSquare className="h-3 w-3 shrink-0 text-primary" />
      {label}
    </button>
  );
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

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
  const canConvertToTask = useCan("projects:tickets:create");
  const canAssignTicket = useCan("projects:tickets:assign");
  const senderName = resolveUserName
    ? resolveUserName(message.senderId, message.sender)
    : (message.sender?.name ?? "Unknown");
  const replySenderName = message.replyTo
    ? resolveUserName
      ? resolveUserName(message.replyTo.sender?.id ?? "", message.replyTo.sender)
      : (message.replyTo.sender?.name ?? "Unknown")
    : null;
  const canSetDueDate = useCan("projects:tickets:update");

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

  const meta = message.metadata as MessageMetadata | null;
  const linkedTicket = (() => {
    const entities = meta?.entities ?? [];
    const t = entities.find((e): e is TicketEntityRef => e.type === "ticket");
    return t !== undefined ? { ticketId: Number(t.id), projectId: t.projectId } : null;
  })();
  const { label: forwardLabel, content: displayContent } = getForwardedDisplay(
    message.content,
    meta?.forwardCount,
  );

  if (message.isDeleted) {
    return (
      <div className={cn("flex mb-[2px] w-full min-w-0", isOwn ? "justify-end" : "justify-start", !isOwn && "ml-9")}>
        <div className="px-3 py-1 rounded-xl bg-muted/20 border border-border/15">
          <p className="text-[11px] text-muted-foreground/40 italic flex items-center gap-1.5">
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
        showSender ? "mt-3 mb-0.5" : "mb-[2px]"
      )}
    >

      {!isOwn && (
        <div className="w-7 shrink-0 self-end">
          {showSender ? (
            <Avatar className="w-7 border border-border/30 shadow-sm">
              <AvatarImage src={resolveImageUrl(message.sender?.image)} />
              <AvatarFallback className="text-[8px] font-bold bg-muted text-muted-foreground">
                {getInitials(senderName)}
              </AvatarFallback>
            </Avatar>
          ) : <div className="w-7" />}
        </div>
      )}

      <div className={cn("min-w-0 max-w-[75%] sm:max-w-[65%] relative flex flex-col", isOwn ? "items-end" : "items-start")}>
        {showSender && !isOwn && (
          <p className="text-[11px] font-bold text-blue mb-1 px-1 ml-1">
            {senderName}
          </p>
        )}

        {message.replyTo && (
          <div
            className={cn(
              "mx-1 mb-0.5 min-w-0 max-w-full px-2.5 py-1.5 rounded-lg border text-[11px]",
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
            <div className="rounded-xl border border-primary/40 bg-background overflow-hidden shadow-sm">
              <textarea
                value={editInput}
                onChange={handleEditInputChange}
                onKeyDown={handleEditKeyDown}
                className="w-full bg-transparent text-[14px] resize-none px-3 py-2 focus:outline-none min-h-[40px]"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2 mt-1 px-1">
              <button onClick={onCancelEdit} className="text-[11px] text-muted-foreground hover:text-foreground">Cancel</button>
              <span className="text-muted-foreground/30">|</span>
              <button onClick={onSaveEdit} className="text-[11px] text-primary font-bold hover:underline">Save</button>
              <span className="text-[10px] text-muted-foreground/30 ml-auto hidden sm:inline">Esc / Enter</span>
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
                  "flex items-center gap-1 mb-1.5 text-[11px] font-medium italic",
                  isOwn ? "text-primary-foreground/85" : "text-muted-foreground",
                )}
              >
                <Forward className="h-3 w-3 shrink-0" />
                <span>{forwardLabel}</span>
              </div>
            )}

            {displayContent && (
              <div className="min-w-0 text-[14px] leading-[1.55] break-words break-all">
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
                            "text-[6px] font-bold px-1 rounded mt-0.5",
                            isOwn ? "bg-primary-foreground/25 text-primary-foreground" : cn("text-white", colors.badge)
                          )}>
                            {getFileExt(att.fileName)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-semibold truncate max-w-[180px]">{att.fileName}</p>
                          <p className={cn("text-[10px] mt-0.5", isOwn ? "text-primary-foreground/60" : "text-muted-foreground")}>
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
                className={cn("text-[11px] font-medium", isOwn ? "text-primary-foreground/80" : "text-muted-foreground")}
                title={formatMessageTimeFull(message.createdAt)}
              >
                {formatMessageTime(message.createdAt)}
              </span>
              {message.isEdited && (
                <span className={cn("text-[11px]", isOwn ? "text-primary-foreground/60" : "text-muted-foreground/70")}>
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
              "mt-1 px-1 flex items-center gap-1 text-[11px] font-medium text-primary hover:underline",
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
                    "flex items-center gap-1 px-2 py-0.5 rounded-full border text-[12px] transition-colors",
                    hasReacted
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-muted/40 border-border/30 hover:bg-muted/60"
                  )}
                >
                  <span>{emoji}</span>
                  <span className="font-medium text-[11px]">{userIds.length}</span>
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
        {canAssignTicket && (
          <AssignTicketDialog
            open={assignDialogOpen}
            onOpenChange={setAssignDialogOpen}
            channelId={message.channelId}
            ticketId={linkedTicket?.ticketId}
            projectId={linkedTicket?.projectId}
          />
        )}
        {canSetDueDate && (
          <SetDueDateDialog
            open={dueDateDialogOpen}
            onOpenChange={setDueDateDialogOpen}
            channelId={message.channelId}
            ticketId={linkedTicket?.ticketId}
            projectId={linkedTicket?.projectId}
          />
        )}
        {!isEditing && (
          <div
            className={cn(
              "absolute -top-3 opacity-0 group-hover:opacity-100 transition-all z-50 pointer-events-none group-hover:pointer-events-auto",
              isOwn ? "right-0" : "left-0",
            )}
          >
            <div className="relative flex items-center bg-background border border-border/60 rounded-lg shadow-md overflow-visible pointer-events-auto">
              <ReplyButton
                onClick={onReply}
                className="p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                title="Reply"
                aria-label="Reply"
              />
              <button onClick={onOpenThread} className="p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground" title="Open thread" aria-label="Open thread">
                <MessageSquare className="h-3.5 w-3.5" />
              </button>
              {onSave && (
                <SaveButton
                  isSaved={isSaved ?? false}
                  onClick={isSaved ? onUnsaveMsg : onSave}
                  className={cn("p-1.5 hover:bg-muted/50 hover:text-foreground", isSaved ? "text-amber-500" : "text-muted-foreground")}
                  title={isSaved ? "Unsave" : "Save message"}
                  aria-label={isSaved ? "Unsave message" : "Save message"}
                />
              )}
              <button
                onClick={handlePinToggle}
                className={cn("p-1.5 hover:bg-muted/50 hover:text-foreground", isPinned ? "text-amber-500" : "text-muted-foreground")}
                title={isPinned ? "Unpin" : "Pin"}
                aria-label={isPinned ? "Unpin message" : "Pin message"}
              >
                <Pin className={cn("h-3.5 w-3.5", isPinned && "fill-amber-500")} />
              </button>
              <button
                onClick={handleToggleReactionPicker}
                className={cn("p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground", showReactionPicker && "bg-muted/50 text-foreground")}
                title="React"
                aria-label="Add reaction"
              >
                <Smile className="h-3.5 w-3.5" />
              </button>
              {message.content && (
                <CopyButton
                  onClick={handleCopy}
                  className="p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  title="Copy"
                  aria-label="Copy"
                />
              )}
              <button
                onClick={handleCopyLink}
                className="p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                title="Copy link"
                aria-label="Copy message link"
              >
                <Link className="h-3.5 w-3.5" />
              </button>
              {onForward && (
                <button
                  onClick={onForward}
                  className="p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  title="Forward"
                  aria-label="Forward message"
                >
                  <Forward className="h-3.5 w-3.5" />
                </button>
              )}
              {canConvertToTask && (
                <button
                  onClick={handleOpenConvertDialog}
                  className="p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  title="Convert to task"
                  aria-label="Convert to task"
                >
                  <ListPlus className="h-3.5 w-3.5" />
                </button>
              )}
              {canAssignTicket && (
                <UserPlusButton
                  onClick={handleOpenAssignDialog}
                  className="p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  title="Assign ticket"
                  aria-label="Assign ticket"
                />
              )}
              {canSetDueDate && (
                <button
                  onClick={handleOpenDueDateDialog}
                  className="p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  title="Set due date"
                  aria-label="Set due date"
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                </button>
              )}
              {isOwn && (
                <button onClick={onStartEdit} className="p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground" title="Edit" aria-label="Edit">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {isOwn && (
                <div className="relative group/delete">
                  <DeleteButton
                    className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-400"
                    title="Delete"
                    aria-label="Delete"
                  />
                  <div className="absolute right-0 top-full mt-1 hidden group-hover/delete:flex flex-col bg-background border border-border rounded-lg shadow-lg overflow-hidden z-50 min-w-[160px]">
                    <button
                      onClick={onDelete}
                      className="px-3 py-2 text-[11px] text-left hover:bg-red-500/10 text-red-500 font-medium whitespace-nowrap"
                    >
                      Delete for Everyone
                    </button>
                  </div>
                </div>
              )}
              {showReactionPicker && (
                <div className={cn(
                  "absolute top-full mt-1 z-50 bg-background border border-border/60 rounded-xl shadow-lg p-1.5 flex gap-1",
                  isOwn ? "right-0" : "left-0"
                )}>
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleQuickReact(emoji)}
                      className="w-7 flex items-center justify-center rounded-lg hover:bg-muted/60 text-base transition-colors"
                      aria-label={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
