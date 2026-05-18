"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowDown,
  CheckCheck,
  Copy,
  FileText,
  MoreHorizontal,
  Pencil,
  Reply,
  SmilePlus,
  Trash2,
  Eye,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn, resolveImageUrl } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMessageReaders, useChatOrgUsers } from "@/lib/api/hooks/chat";
import {
  getInitials,
  formatMessageTime,
  formatMessageTimeFull,
  formatFileSize,
  getFileExt,
  getFileColor,
  isImageMime,
  resolveFileUrl,
  isOfficeLikeFileName,
  getAttachmentDownloadHref,
  fetchSignedFileUrlForOpen,
} from "./chat-helpers";
import { EmojiGrid } from "./emoji-grid";
import type { Message } from "./chat-types";

function MessageReadReceipts({
  channelId,
  messageId,
}: {
  channelId: number;
  messageId: number;
}) {
  const [open, setOpen] = useState(false);
  const { data, isFetching } = useMessageReaders(channelId, messageId, open);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[10px] font-medium text-white/75 hover:text-white mt-0.5"
          aria-label="Read receipts"
        >
          <Eye className="h-3 w-3" />
          Seen
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 text-xs" align="end">
        {isFetching ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : data?.readerNames?.length ? (
          <p className="text-foreground">
            <span className="text-muted-foreground">Read by: </span>
            {data.readerNames.join(", ")}
          </p>
        ) : (
          <p className="text-muted-foreground">No other members have read this yet.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function ReactionWithWho({
  emoji,
  userIds,
  reactedByMe,
  currentUserId,
  isOwnBubble,
  profiles,
  onToggle,
}: {
  emoji: string;
  userIds: string[];
  reactedByMe: boolean;
  currentUserId: string;
  isOwnBubble: boolean;
  profiles: Map<string, { name: string; image: string | null }>;
  onToggle: () => void;
}) {
  const [whoOpen, setWhoOpen] = useState(false);

  const resolved = useMemo(() => {
    const rows = userIds.map((id) => {
      const p = profiles.get(id);
      return {
        id,
        label: p?.name ?? "Member",
        image: p?.image ?? null,
        isMe: id === currentUserId,
      };
    });
    rows.sort((a, b) => {
      if (a.isMe !== b.isMe) return a.isMe ? -1 : 1;
      return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
    });
    return rows;
  }, [userIds, profiles, currentUserId]);

  const shellClass = cn(
    "inline-flex items-stretch h-6 rounded-full border text-[11px] transition-colors overflow-hidden",
    reactedByMe
      ? "bg-gold/10 border-gold/40 text-foreground"
      : "bg-background border-border/60 text-muted-foreground hover:bg-muted/40"
  );

  return (
    <div className={shellClass}>
      <button
        type="button"
        title={reactedByMe ? "Remove your reaction" : "React with this emoji"}
        aria-label={reactedByMe ? "Remove reaction" : "Add reaction"}
        onClick={onToggle}
        className="inline-flex items-center gap-0.5 pl-1.5 pr-1 shrink-0 hover:bg-black/5 dark:hover:bg-white/5"
      >
        <span className="text-[13px] leading-none">{emoji}</span>
      </button>
      <Popover open={whoOpen} onOpenChange={setWhoOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Who reacted"
            aria-label={`Who reacted: ${userIds.length}`}
            className={cn(
              "inline-flex items-center gap-0.5 min-w-[1.25rem] px-1.5 border-l font-semibold tabular-nums hover:bg-black/5 dark:hover:bg-white/5",
              isOwnBubble ? "border-white/20" : "border-border/50"
            )}
          >
            <Users className="h-2.5 w-2.5 opacity-70 shrink-0" aria-hidden />
            {userIds.length}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0 text-xs" align={isOwnBubble ? "end" : "start"}>
          <div className="px-3 py-2 border-b border-border/50 font-medium text-foreground flex items-center gap-1.5">
            <span className="text-base leading-none">{emoji}</span>
            <span>Reactions ({userIds.length})</span>
          </div>
          <ul className="max-h-48 overflow-y-auto py-1.5">
            {resolved.map(({ id, label, image, isMe }) => (
              <li
                key={id}
                className="px-3 py-1.5 flex items-center gap-2 text-foreground"
              >
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage src={resolveImageUrl(image)} />
                  <AvatarFallback className="text-[9px] bg-muted">
                    {getInitials(label)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">
                  {label}
                  {isMe ? (
                    <span className="text-muted-foreground font-normal"> (you)</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function ChatBubble({
  message,
  isOwn,
  showSender,
  isEditing,
  editInput,
  currentUserId,
  channelId,
  onEditInputChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onReply,
  onDelete,
  onReact,
}: {
  message: Message;
  isOwn: boolean;
  showSender: boolean;
  isEditing: boolean;
  editInput: string;
  currentUserId: string;
  channelId: number;
  onEditInputChange: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onReply: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: orgUsers } = useChatOrgUsers(channelId > 0);

  const reactionProfiles = useMemo(() => {
    const map = new Map<string, { name: string; image: string | null }>();
    for (const u of orgUsers ?? []) {
      const name =
        (u.name && u.name.trim()) ||
        (u.email && u.email.split("@")[0]) ||
        "Member";
      map.set(u.id, { name, image: u.image ?? null });
    }
    if (message.sender?.id) {
      const name = message.sender.name?.trim() || "Member";
      map.set(message.sender.id, {
        name,
        image: message.sender.image ?? null,
      });
    }
    return map;
  }, [orgUsers, message.sender]);

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      onReact(emoji);
      setMenuOpen(false);
    },
    [onReact]
  );
  const reactionEntries = Object.entries(message.reactions ?? {}).filter(
    ([, ids]) => ids.length > 0
  );
  const handleEditInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => onEditInputChange(e.target.value), [onEditInputChange]);
  const handleEditKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSaveEdit(); }
    if (e.key === "Escape") onCancelEdit();
  }, [onSaveEdit, onCancelEdit]);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content!);
    toast.success("Copied");
  }, [message.content]);

  const handleOpenOfficeFile = useCallback(async (fileUrl: string, mimeType: string) => {
    try {
      const signed = await fetchSignedFileUrlForOpen(fileUrl, mimeType);
      if (signed) {
        window.open(signed, "_blank", "noopener,noreferrer");
      } else {
        toast.error("Could not open file");
      }
    } catch {
      toast.error("Could not open file");
    }
  }, []);

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

      <div className={cn("max-w-[75%] sm:max-w-[65%] min-w-0 relative flex flex-col", isOwn ? "items-end" : "items-start")}>
        {showSender && !isOwn && (
          <p className="text-[11px] font-bold text-blue mb-1 px-1 ml-1 truncate max-w-full">
            {message.sender?.name}
          </p>
        )}

        {message.replyTo && (
          <div
            className={cn(
              "mx-1 mb-0.5 px-2.5 py-1.5 rounded-lg border text-[11px] max-w-full min-w-0 w-full",
              isOwn
                ? "bg-gold/5 border-gold/15"
                : "bg-blue/5 border-blue/10"
            )}
          >
            <p className={cn("font-bold truncate", isOwn ? "text-gold" : "text-blue")}>
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
              "relative px-3.5 py-2 shadow-sm max-w-full min-w-0",
              isOwn
                ? "bg-gradient-to-br from-gold to-amber-700 text-white rounded-2xl rounded-br-md"
                : "bg-card border border-border/40 text-foreground rounded-2xl rounded-bl-md"
            )}
          >
            {message.content && (
              <p
                className={cn(
                  "text-[14px] whitespace-pre-wrap break-words leading-[1.55] [overflow-wrap:anywhere]",
                  isOwn ? "text-white" : "text-foreground"
                )}
              >
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
                    const downloadHref = getAttachmentDownloadHref(att.fileUrl, att.mimeType);
                    const office = isOfficeLikeFileName(att.fileName);
                    return (
                      <div
                        key={att.id}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl border",
                          isOwn
                            ? "bg-white/10 border-white/15"
                            : "bg-background border-border/50 shadow-sm"
                        )}
                      >
                        <div
                          className={cn(
                            "h-10 w-10 rounded-lg flex flex-col items-center justify-center shrink-0",
                            isOwn ? "bg-white/15" : colors.bg
                          )}
                        >
                          <FileText className={cn("h-4 w-4", isOwn ? "text-white/80" : colors.text)} />
                          <span
                            className={cn(
                              "text-[6px] font-bold text-white px-1 rounded mt-0.5",
                              isOwn ? "bg-white/30" : colors.badge
                            )}
                          >
                            {getFileExt(att.fileName)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-semibold truncate max-w-[160px]">{att.fileName}</p>
                          <p
                            className={cn(
                              "text-[10px] mt-0.5",
                              isOwn ? "text-white/60" : "text-muted-foreground"
                            )}
                          >
                            {formatFileSize(att.fileSize)} · {getFileExt(att.fileName)}
                          </p>
                        </div>
                        {office ? (
                          <div className="flex flex-col gap-1 shrink-0 items-stretch">
                            <a
                              href={downloadHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={att.fileName}
                              className={cn(
                                "text-[10px] font-semibold px-2 py-1 rounded-md text-center border transition-colors",
                                isOwn
                                  ? "border-white/25 text-white hover:bg-white/15"
                                  : "border-border bg-muted/40 hover:bg-muted/70 text-foreground"
                              )}
                            >
                              Download
                            </a>
                            <button
                              type="button"
                              onClick={() => handleOpenOfficeFile(att.fileUrl, att.mimeType)}
                              className={cn(
                                "text-[10px] font-semibold px-2 py-1 rounded-md text-center border transition-colors",
                                isOwn
                                  ? "border-white/25 text-white hover:bg-white/15"
                                  : "border-border bg-muted/40 hover:bg-muted/70 text-foreground"
                              )}
                            >
                              Open
                            </button>
                          </div>
                        ) : (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "shrink-0 p-1.5 rounded-md transition-colors",
                              isOwn ? "hover:bg-white/15" : "hover:bg-muted/50"
                            )}
                            aria-label="Download or open file"
                          >
                            <ArrowDown className={cn("h-4 w-4", isOwn ? "text-white/50" : "text-muted-foreground/50")} />
                          </a>
                        )}
                      </div>
                    );
                  })();
                })}
              </div>
            )}

            <div
              className={cn(
                "flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1",
                isOwn ? "justify-end" : "justify-start"
              )}
            >
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
              {isOwn &&
                message.content &&
                message.messageType === "text" &&
                channelId > 0 && (
                  <MessageReadReceipts channelId={channelId} messageId={message.id} />
                )}
            </div>
          </div>
        )}

        {reactionEntries.length > 0 && (
          <div
            className={cn(
              "flex flex-wrap gap-1 mt-1 px-1 max-w-full",
              isOwn ? "justify-end" : "justify-start"
            )}
          >
            {reactionEntries.map(([emoji, userIds]) => {
              const reactedByMe = userIds.includes(currentUserId);
              return (
                <ReactionWithWho
                  key={emoji}
                  emoji={emoji}
                  userIds={userIds}
                  reactedByMe={reactedByMe}
                  currentUserId={currentUserId}
                  isOwnBubble={isOwn}
                  profiles={reactionProfiles}
                  onToggle={() => onReact(emoji)}
                />
              );
            })}
          </div>
        )}

        {!isEditing && (
          <div
            className={cn(
              "absolute -top-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-20",
              isOwn ? "left-0" : "right-0"
            )}
          >
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border/60 bg-background shadow-sm text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  aria-label="Message actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align={isOwn ? "start" : "end"}
                className="w-48"
              >
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="text-xs">
                    <SmilePlus className="h-3.5 w-3.5 mr-2" />
                    React
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="p-0 border-0 bg-transparent shadow-none">
                    <div className="rounded-md border bg-popover p-1 shadow-md">
                      <EmojiGrid onSelect={handleEmojiSelect} />
                    </div>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem
                  className="text-xs"
                  onClick={() => {
                    setMenuOpen(false);
                    onReply();
                  }}
                >
                  <Reply className="h-3.5 w-3.5 mr-2" />
                  Reply
                </DropdownMenuItem>
                {message.content ? (
                  <DropdownMenuItem
                    className="text-xs"
                    onClick={() => {
                      setMenuOpen(false);
                      handleCopy();
                    }}
                  >
                    <Copy className="h-3.5 w-3.5 mr-2" />
                    Copy
                  </DropdownMenuItem>
                ) : null}
                {isOwn ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-xs"
                      onClick={() => {
                        setMenuOpen(false);
                        onStartEdit();
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-xs text-destructive focus:text-destructive"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete();
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
}
