"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { ArrowDown, Bookmark, BookmarkCheck, BookmarkPlus, CheckCheck, Copy, FileText, Forward, Link, MessageSquare, Pencil, Reply, Smile, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/utils";
import {
  getInitials,
  formatMessageTime,
  formatMessageTimeFull,
  formatFileSize,
  getFileExt,
  getFileColor,
  isImageMime,
  resolveFileUrl,
} from "./chat-helpers";
import type { Message } from "./chat-types";
import { LinkPreviewCard } from "./link-preview-card";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

function renderFormattedContent(content: string, isOwn: boolean): React.ReactNode {
  const lines = content.split("\n");
  const result: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      result.push(
        <pre
          key={i}
          className={cn(
            "font-mono text-[12px] rounded-lg p-2.5 mt-1.5 overflow-x-auto whitespace-pre",
            isOwn ? "bg-black/20 text-white/90" : "bg-muted text-foreground",
          )}
        >
          {codeLines.join("\n")}
        </pre>,
      );
    } else {
      const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
      result.push(
        <span key={i} className="block">
          {parts.map((part, j) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return <strong key={j}>{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith("*") && part.endsWith("*")) {
              return <em key={j}>{part.slice(1, -1)}</em>;
            }
            if (part.startsWith("`") && part.endsWith("`")) {
              return (
                <code
                  key={j}
                  className={cn(
                    "font-mono text-[12px] px-1.5 py-0.5 rounded",
                    isOwn ? "bg-black/20 text-white/90" : "bg-muted",
                  )}
                >
                  {part.slice(1, -1)}
                </code>
              );
            }
            return <span key={j}>{part}</span>;
          })}
        </span>,
      );
    }
    i++;
  }
  return result;
}

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
}) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);

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

  if (message.isDeleted) {
    return (
      <div className={cn("flex mb-[2px]", isOwn ? "justify-end" : "justify-start", !isOwn && "ml-9")}>
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
        "group flex gap-2",
        isOwn ? "justify-end" : "justify-start",
        showSender ? "mt-3 mb-0.5" : "mb-[2px]"
      )}
    >

      {!isOwn && (
        <div className="w-7 shrink-0 self-end">
          {showSender ? (
            <Avatar className="h-7 w-7 border border-border/30 shadow-sm">
              <AvatarImage src={resolveImageUrl(message.sender?.image)} />
              <AvatarFallback className="text-[8px] font-bold bg-gradient-to-br from-blue-100 to-indigo-50 text-blue">
                {getInitials(message.sender?.name)}
              </AvatarFallback>
            </Avatar>
          ) : <div className="w-7" />}
        </div>
      )}

      <div className={cn("max-w-[75%] sm:max-w-[65%] relative flex flex-col", isOwn ? "items-end" : "items-start")}>
        {showSender && !isOwn && (
          <p className="text-[11px] font-bold text-blue mb-1 px-1 ml-1">
            {message.sender?.name}
          </p>
        )}

        {message.replyTo && (
          <div
            className={cn(
              "mx-1 mb-0.5 px-2.5 py-1.5 rounded-lg border text-[11px]",
              isOwn
                ? "bg-blue-500/5 border-blue-500/15"
                : "bg-blue/5 border-blue/10"
            )}
          >
            <p className={cn("font-bold", isOwn ? "text-blue-600" : "text-blue")}>
              {message.replyTo.sender?.name}
            </p>
            <p className="text-muted-foreground truncate">{message.replyTo.content}</p>
          </div>
        )}

        {isEditing ? (
          <div className="mx-1">
            <div className="rounded-xl border border-blue-500/40 bg-background overflow-hidden shadow-sm">
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
              <button onClick={onSaveEdit} className="text-[11px] text-blue-600 font-bold hover:underline">Save</button>
              <span className="text-[10px] text-muted-foreground/30 ml-auto hidden sm:inline">Esc / Enter</span>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "relative px-3.5 py-2 shadow-sm",
              isOwn
                ? "bg-gradient-to-br from-blue-500 to-amber-700 text-white rounded-2xl rounded-br-md"
                : "bg-card border border-border/40 text-foreground rounded-2xl rounded-bl-md"
            )}
          >
            {message.content && (
              <div className={cn("text-[14px] leading-[1.55] break-words", isOwn ? "text-white" : "text-foreground")}>
                {renderFormattedContent(message.content, isOwn)}
              </div>
            )}

            {message.content && /https?:\/\//.test(message.content) && (
              <LinkPreviewCard content={message.content} isOwn={isOwn} />
            )}

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
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors",
                          isOwn
                            ? "bg-white/10 border-white/15 hover:bg-white/20"
                            : "bg-background border-border/50 hover:bg-muted/30 shadow-sm"
                        )}
                      >
                        <div className={cn(
                          "h-10 w-10 rounded-lg flex flex-col items-center justify-center shrink-0",
                          isOwn ? "bg-white/15" : colors.bg
                        )}>
                          <FileText className={cn("h-4 w-4", isOwn ? "text-white/80" : colors.text)} />
                          <span className={cn(
                            "text-[6px] font-bold text-white px-1 rounded mt-0.5",
                            isOwn ? "bg-white/30" : colors.badge
                          )}>
                            {getFileExt(att.fileName)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-semibold truncate max-w-[180px]">{att.fileName}</p>
                          <p className={cn("text-[10px] mt-0.5", isOwn ? "text-white/60" : "text-muted-foreground")}>
                            {formatFileSize(att.fileSize)} · {getFileExt(att.fileName)}
                          </p>
                        </div>
                        <ArrowDown className={cn("h-4 w-4 shrink-0", isOwn ? "text-white/50" : "text-muted-foreground/50")} />
                      </a>
                    );
                  })();
                })}
              </div>
            )}

            <div className={cn("flex items-center gap-1.5 mt-1", isOwn ? "justify-end" : "justify-start")}>
              <span
                className={cn("text-[11px] font-medium", isOwn ? "text-white/80" : "text-muted-foreground")}
                title={formatMessageTimeFull(message.createdAt)}
              >
                {formatMessageTime(message.createdAt)}
              </span>
              {message.isEdited && (
                <span className={cn("text-[11px]", isOwn ? "text-white/60" : "text-muted-foreground/70")}>
                  edited
                </span>
              )}
              {isOwn && <CheckCheck className={cn("h-3.5 w-3.5", "text-white/70")} />}
            </div>
          </div>
        )}

        {replyCount !== undefined && replyCount > 0 && (
          <button
            onClick={onOpenThread}
            className={cn(
              "mt-1 px-1 flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline",
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
                      ? "bg-blue-500/15 border-blue-500/30 text-blue-600"
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

        {!isEditing && (
          <div
            className={cn(
              "absolute -top-3 opacity-0 group-hover:opacity-100 transition-all z-10",
              isOwn ? "left-0" : "right-0"
            )}
          >
            <div className="relative flex items-center bg-background border border-border/60 rounded-lg shadow-md overflow-visible">
              <button onClick={onReply} className="p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground" title="Reply" aria-label="Reply">
                <Reply className="h-3.5 w-3.5" />
              </button>
              <button onClick={onOpenThread} className="p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground" title="Open thread" aria-label="Open thread">
                <MessageSquare className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handlePinToggle}
                className={cn("p-1.5 hover:bg-muted/50 hover:text-foreground", isPinned ? "text-amber-500" : "text-muted-foreground")}
                title={isPinned ? "Unpin" : "Pin"}
                aria-label={isPinned ? "Unpin message" : "Pin message"}
              >
                <Bookmark className={cn("h-3.5 w-3.5", isPinned && "fill-amber-500")} />
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
                <button
                  onClick={handleCopy}
                  className="p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  title="Copy"
                  aria-label="Copy"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
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
              {onSave && (
                <button
                  onClick={isSaved ? onUnsaveMsg : onSave}
                  className={cn("p-1.5 hover:bg-muted/50 hover:text-foreground", isSaved ? "text-amber-500" : "text-muted-foreground")}
                  title={isSaved ? "Unsave" : "Save message"}
                  aria-label={isSaved ? "Unsave message" : "Save message"}
                >
                  {isSaved ? <BookmarkCheck className="h-3.5 w-3.5 fill-amber-500" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
                </button>
              )}
              {isOwn && (
                <button onClick={onStartEdit} className="p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground" title="Edit" aria-label="Edit">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {isOwn && (
                <div className="relative group/delete">
                  <button className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-400" title="Delete" aria-label="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
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
                      className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted/60 text-base transition-colors"
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
