"use client";

import React from "react";
import { CalendarClock, Forward, Link, ListPlus, MessageSquare, Pencil, Pin, Smile } from "lucide-react";
import { ReplyIcon, BookmarkCheckIcon, BookmarkPlusIcon, CopyIcon, Trash2Icon, UserPlusIcon } from "@animateicons/react/lucide";
import { cn } from "@/lib/utils";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

function IconButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={className} {...props}>{children}</button>;
}

export function MessageActions({
  isOwn,
  isPinned,
  isSaved,
  messageContent,
  showReactionPicker,
  onReply,
  onOpenThread,
  onSave,
  onUnsave,
  onPinToggle,
  onToggleReactionPicker,
  onCopy,
  onCopyLink,
  onForward,
  canConvertToTask,
  onConvertToTask,
  canAssignTicket,
  onAssignTicket,
  canSetDueDate,
  onSetDueDate,
  onStartEdit,
  onDelete,
  onQuickReact,
}: {
  isOwn: boolean;
  isPinned?: boolean;
  isSaved?: boolean;
  messageContent: string | null;
  showReactionPicker: boolean;
  onReply: () => void;
  onOpenThread: () => void;
  onSave?: () => void;
  onUnsave?: () => void;
  onPinToggle: () => void;
  onToggleReactionPicker: () => void;
  onCopy: () => void;
  onCopyLink: () => void;
  onForward?: () => void;
  canConvertToTask: boolean;
  onConvertToTask: () => void;
  canAssignTicket: boolean;
  onAssignTicket: () => void;
  canSetDueDate: boolean;
  onSetDueDate: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
  onQuickReact: (emoji: string) => void;
}) {
  return (
    <div className={cn("absolute -top-3 opacity-0 group-hover:opacity-100 transition-all z-50 pointer-events-none group-hover:pointer-events-auto", isOwn ? "right-0" : "left-0")}>
      <div className="relative flex items-center bg-background border border-border/60 rounded-lg shadow-md overflow-visible pointer-events-auto">
        <IconButton onClick={onReply} className="p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground" title="Reply" aria-label="Reply"><ReplyIcon size={14} /></IconButton>
        <button onClick={onOpenThread} className="p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground" title="Open thread" aria-label="Open thread"><MessageSquare className="h-3.5 w-3.5" /></button>
        {onSave && <IconButton onClick={isSaved ? onUnsave : onSave} className={cn("p-1.5 hover:bg-muted/50 hover:text-foreground", isSaved ? "text-status-warning-ink" : "text-muted-foreground")} title={isSaved ? "Unsave" : "Save message"} aria-label={isSaved ? "Unsave message" : "Save message"}>{isSaved ? <BookmarkCheckIcon size={14} className="fill-amber-500" /> : <BookmarkPlusIcon size={14} />}</IconButton>}
        <button onClick={onPinToggle} className={cn("p-1.5 hover:bg-muted/50 hover:text-foreground", isPinned ? "text-status-warning-ink" : "text-muted-foreground")} title={isPinned ? "Unpin" : "Pin"} aria-label={isPinned ? "Unpin message" : "Pin message"}><Pin className={cn("h-3.5 w-3.5", isPinned && "fill-amber-500")} /></button>
        <button onClick={onToggleReactionPicker} className={cn("p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground", showReactionPicker && "bg-muted/50 text-foreground")} title="React" aria-label="Add reaction"><Smile className="h-3.5 w-3.5" /></button>
        {messageContent && <IconButton onClick={onCopy} className="p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground" title="Copy" aria-label="Copy"><CopyIcon size={14} /></IconButton>}
        <button onClick={onCopyLink} className="p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground" title="Copy link" aria-label="Copy message link"><Link className="h-3.5 w-3.5" /></button>
        {onForward && <button onClick={onForward} className="p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground" title="Forward" aria-label="Forward message"><Forward className="h-3.5 w-3.5" /></button>}
        {canConvertToTask && <button onClick={onConvertToTask} className="p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground" title="Convert to task" aria-label="Convert to task"><ListPlus className="h-3.5 w-3.5" /></button>}
        {canAssignTicket && <IconButton onClick={onAssignTicket} className="p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground" title="Assign ticket" aria-label="Assign ticket"><UserPlusIcon size={14} /></IconButton>}
        {canSetDueDate && <button onClick={onSetDueDate} className="p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground" title="Set due date" aria-label="Set due date"><CalendarClock className="h-3.5 w-3.5" /></button>}
        {isOwn && <button onClick={onStartEdit} className="p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground" title="Edit" aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></button>}
        {isOwn && <div className="relative group/delete"><IconButton className="p-1.5 hover:bg-status-danger-surface text-muted-foreground hover:text-status-danger-ink" title="Delete" aria-label="Delete"><Trash2Icon size={14} /></IconButton><div className="absolute right-0 top-full mt-1 hidden group-hover/delete:flex flex-col bg-background border border-border rounded-lg shadow-lg overflow-hidden z-50 min-w-[160px]"><button onClick={onDelete} className="px-3 py-2 text-dense text-left hover:bg-status-danger-surface text-status-danger-ink font-medium whitespace-nowrap">Delete for Everyone</button></div></div>}
        {showReactionPicker && <div className={cn("absolute top-full mt-1 z-50 bg-background border border-border/60 rounded-xl shadow-lg p-1.5 flex gap-1", isOwn ? "right-0" : "left-0")}>{QUICK_REACTIONS.map((emoji) => <button key={emoji} onClick={() => onQuickReact(emoji)} className="w-7 flex items-center justify-center rounded-lg hover:bg-muted/60 text-base transition-colors" aria-label={`React with ${emoji}`}>{emoji}</button>)}</div>}
      </div>
    </div>
  );
}
