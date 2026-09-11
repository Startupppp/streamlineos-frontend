"use client";

import { useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileText, Loader2, Reply, X } from "lucide-react";
import { cn, resolveImageUrl } from "@/lib/utils";
import { getFileColor, getFileExt } from "./chat-helpers";
import { formatFileSize, getInitials } from "@/lib/format-utils";
import type { PendingAttachment, OrgUser } from "./message-input-types";
import type { Message } from "./chat-types";

interface MentionItemProps {
  user: OrgUser;
  idx: number;
  mentionIndex: number;
  onInsert: (name: string, userId: string) => void;
}

export function MentionItem({ user, idx, mentionIndex, onInsert }: MentionItemProps) {
  const handleClick = useCallback(
    () => onInsert(user.name ?? "", user.id),
    [user.name, user.id, onInsert],
  );
  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/40 transition-colors",
        idx === mentionIndex && "bg-status-info-surface",
      )}
    >
      <Avatar className="h-6 w-6">
        <AvatarImage src={resolveImageUrl(user.image)} />
        <AvatarFallback className="text-micro">{getInitials(user.name)}</AvatarFallback>
      </Avatar>
      <span className="text-label font-medium">{user.name}</span>
      <span className="text-dense text-muted-foreground ml-auto">{user.role}</span>
    </button>
  );
}

interface PendingAttachmentItemProps {
  att: PendingAttachment;
  idx: number;
  onRemove: (idx: number) => void;
}

export function PendingAttachmentItem({ att, idx, onRemove }: PendingAttachmentItemProps) {
  const handleRemove = useCallback(() => onRemove(idx), [idx, onRemove]);
  const colors = getFileColor(att.fileName);
  return (
    <div className="relative group flex items-center gap-2.5 bg-background border border-border rounded-xl px-3 py-2 shadow-sm">
      {att.mimeType.startsWith("image/") ? (
        <Image
          src={resolveImageUrl(att.fileUrl) ?? att.fileUrl}
          alt={att.fileName}
          width={44}
          height={44}
          unoptimized
          className="h-11 w-11 rounded-lg object-cover border border-border/30"
        />
      ) : (
        <div className={cn("h-11 w-11 rounded-lg flex flex-col items-center justify-center relative", colors.bg)}>
          <FileText className={cn("h-5 w-5", colors.text)} />
          <span className={cn("text-micro font-bold text-white px-1 rounded mt-0.5", colors.badge)}>
            {getFileExt(att.fileName)}
          </span>
        </div>
      )}
      <div className="min-w-0 max-w-[140px]">
        <p className="text-xs font-medium truncate">{att.fileName}</p>
        <p className="text-micro text-muted-foreground">{formatFileSize(att.fileSize)}</p>
      </div>
      <button
        onClick={handleRemove}
        aria-label="Remove attachment"
        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-status-danger-fill text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

interface ChatReplyPreviewProps {
  replyTo: Message | null;
  onCancel: () => void;
}

export function ChatReplyPreview({ replyTo, onCancel }: ChatReplyPreviewProps) {
  return (
    <AnimatePresence>
      {replyTo && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="border-t border-border/30 bg-muted/20"
        >
          <div className="flex items-center gap-3 px-4 py-2 max-w-[900px] mx-auto">
            <div className="w-1 h-9 rounded-full bg-status-info-fill shrink-0" />
            <Reply className="h-4 w-4 text-status-info-ink shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-status-info-ink">
                Replying to {replyTo.sender?.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {replyTo.content}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-1 hover:bg-muted rounded-md"
              aria-label="Cancel reply"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ChatMentionSuggestionsOverlayProps {
  showMentions: boolean;
  filteredMentions: OrgUser[];
  mentionIndex: number;
  insertMention: (name: string, userId: string) => void;
}

export function ChatMentionSuggestionsOverlay({
  showMentions,
  filteredMentions,
  mentionIndex,
  insertMention,
}: ChatMentionSuggestionsOverlayProps) {
  return (
    <AnimatePresence>
      {showMentions && filteredMentions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          className="absolute bottom-full left-3 sm:left-6 right-3 sm:right-6 mb-1 z-20"
        >
          <div className="max-w-[800px] mx-auto">
            <div className="bg-background border border-border/60 rounded-xl shadow-lg overflow-hidden max-h-[200px] overflow-y-auto">
              <div className="px-3 py-1.5 text-micro font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/30">
                Members
              </div>
              {filteredMentions.slice(0, 8).map((user, idx) => (
                <MentionItem
                  key={user.id}
                  user={user}
                  idx={idx}
                  mentionIndex={mentionIndex}
                  onInsert={insertMention}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ChatAttachmentsRowProps {
  pendingAttachments: PendingAttachment[];
  onRemove: (idx: number) => void;
  uploading: boolean;
}

export function ChatAttachmentsRow({ pendingAttachments, onRemove, uploading }: ChatAttachmentsRowProps) {
  if (pendingAttachments.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {pendingAttachments.map((att, idx) => (
        <PendingAttachmentItem
          key={idx}
          att={att}
          idx={idx}
          onRemove={onRemove}
        />
      ))}
      {uploading && (
        <div className="flex items-center gap-2 bg-muted/40 border border-border/40 rounded-lg px-3 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-status-info-ink" />
          <span className="text-dense text-muted-foreground">Uploading...</span>
        </div>
      )}
    </div>
  );
}
