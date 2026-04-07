"use client";

import { useCallback } from "react";
import Image from "next/image";
import { ArrowDown, CheckCheck, Copy, FileText, Pencil, Reply, Trash2 } from "lucide-react";
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

export function ChatBubble({
  message,
  isOwn,
  showSender,
  isEditing,
  editInput,
  onEditInputChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onReply,
  onDelete,
}: {
  message: Message;
  isOwn: boolean;
  showSender: boolean;
  isEditing: boolean;
  editInput: string;
  onEditInputChange: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onReply: () => void;
  onDelete: () => void;
}) {
  const handleEditInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => onEditInputChange(e.target.value), [onEditInputChange]);
  const handleEditKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSaveEdit(); }
    if (e.key === "Escape") onCancelEdit();
  }, [onSaveEdit, onCancelEdit]);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content!);
    toast.success("Copied");
  }, [message.content]);

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
      {/* Avatar for receiver */}
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
                ? "bg-gold/5 border-gold/15"
                : "bg-blue/5 border-blue/10"
            )}
          >
            <p className={cn("font-bold", isOwn ? "text-gold" : "text-blue")}>
              {message.replyTo.sender?.name}
            </p>
            <p className="text-muted-foreground truncate">{message.replyTo.content}</p>
          </div>
        )}

        {isEditing ? (
          <div className="mx-1">
            <div className="rounded-xl border border-gold/40 bg-background overflow-hidden shadow-sm">
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
              <button onClick={onSaveEdit} className="text-[11px] text-gold font-bold hover:underline">Save</button>
              <span className="text-[10px] text-muted-foreground/30 ml-auto hidden sm:inline">Esc / Enter</span>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "relative px-3.5 py-2 shadow-sm",
              isOwn
                ? "bg-gradient-to-br from-gold to-amber-700 text-white rounded-2xl rounded-br-md"
                : "bg-card border border-border/40 text-foreground rounded-2xl rounded-bl-md"
            )}
          >
            {message.content && (
              <p className={cn(
                "text-[14px] whitespace-pre-wrap break-words leading-[1.55]",
                isOwn ? "text-white" : "text-foreground"
              )}>
                {message.content}
              </p>
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

        {!isEditing && (
          <div
            className={cn(
              "absolute -top-3 opacity-0 group-hover:opacity-100 transition-all z-10",
              isOwn ? "left-0" : "right-0"
            )}
          >
            <div className="flex items-center bg-background border border-border/60 rounded-lg shadow-md overflow-hidden">
              <button onClick={onReply} className="p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground" title="Reply" aria-label="Reply">
                <Reply className="h-3.5 w-3.5" />
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
              {isOwn && (
                <button onClick={onStartEdit} className="p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground" title="Edit" aria-label="Edit">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {isOwn && (
                <button onClick={onDelete} className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-400" title="Delete" aria-label="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
