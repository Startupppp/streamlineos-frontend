"use client";

import { memo, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { FileText, Loader2, Reply, UserPlus, X } from "lucide-react";
import { cn, resolveImageUrl } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { useAddChannelMember } from "@/hooks/api/chat-core-mutations-b";
import { getFileColor, getFileExt } from "./chat-helpers";
import { formatFileSize, getInitials } from "@/lib/format-utils";
import type { PendingAttachment } from "./message-input-types";
import type { MentionCandidate } from "./use-chat-mentions";
import type { MentionPrompt } from "./use-message-composer";
import type { Message } from "./chat-types";

interface MentionItemProps {
  candidate: MentionCandidate;
  isActive: boolean;
  onInsert: (candidate: MentionCandidate) => void;
}

const MentionItem = memo(function MentionItem({ candidate, isActive, onInsert }: MentionItemProps) {
  const handleClick = useCallback(() => onInsert(candidate), [candidate, onInsert]);
  const handleMouseDown = useCallback((event: React.MouseEvent) => event.preventDefault(), []);
  return (
    <button
      type="button"
      role="option"
      aria-selected={isActive}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/40 transition-colors",
        isActive && "bg-status-info-surface",
      )}
    >
      <Avatar className="h-6 w-6">
        <AvatarImage src={resolveImageUrl(candidate.image)} />
        <AvatarFallback className="text-micro">
          {getInitials(candidate.name)}
        </AvatarFallback>
      </Avatar>
      <span className="text-label font-medium">{candidate.name}</span>
      {!candidate.isMember && (
        <span className="text-dense text-muted-foreground ml-auto">
          Not in conversation
        </span>
      )}
    </button>
  );
});

interface PendingAttachmentItemProps {
  att: PendingAttachment;
  idx: number;
  onRemove: (idx: number) => void;
}

export function PendingAttachmentItem({
  att,
  idx,
  onRemove,
}: PendingAttachmentItemProps) {
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
        <div
          className={cn(
            "h-11 w-11 rounded-lg flex flex-col items-center justify-center relative",
            colors.bg,
          )}
        >
          <FileText className={cn("h-5 w-5", colors.text)} />
          <span
            className={cn(
              "text-micro font-bold text-white px-1 rounded mt-0.5",
              colors.badge,
            )}
          >
            {getFileExt(att.fileName)}
          </span>
        </div>
      )}
      <div className="min-w-0 max-w-[140px]">
        <p className="text-xs font-medium truncate">{att.fileName}</p>
        <p className="text-micro text-muted-foreground">
          {formatFileSize(att.fileSize)}
        </p>
      </div>
      <button
        type="button"
        onClick={handleRemove}
        aria-label="Remove attachment"
        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-status-danger-fill text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity shadow-sm"
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
              type="button"
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
  filteredMentions: MentionCandidate[];
  mentionIndex: number;
  insertMention: (candidate: MentionCandidate) => void;
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
                People
              </div>
              <div role="listbox" aria-label="People">
                {filteredMentions.map((candidate, idx) => (
                  <MentionItem
                    key={candidate.id}
                    candidate={candidate}
                    isActive={idx === mentionIndex}
                    onInsert={insertMention}
                  />
                ))}
              </div>
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

export function ChatAttachmentsRow({
  pendingAttachments,
  onRemove,
  uploading,
}: ChatAttachmentsRowProps) {
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

interface ChatMentionMembershipPromptProps {
  channelId: number;
  prompt: MentionPrompt;
  onDismiss: () => void;
}

export function ChatMentionMembershipPrompt({ channelId, prompt, onDismiss }: ChatMentionMembershipPromptProps) {
  const canAdd = useCan("chat:channels:write");
  const addMember = useAddChannelMember();
  const { mutate } = addMember;
  const handleAdd = useCallback(() => {
    mutate(
      { channelId, userId: prompt.userId },
      {
        onSuccess: () => {
          toast.success(`Added ${prompt.name} to the conversation`);
          onDismiss();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [mutate, channelId, prompt.userId, prompt.name, onDismiss]);

  return (
    <div
      role="status"
      className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2 text-xs"
    >
      <UserPlus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1 text-foreground">{prompt.name} isn&apos;t in this conversation</span>
      {canAdd && (
        <LoadingButton type="button" size="sm" variant="outline" isPending={addMember.isPending} onClick={handleAdd}>
          Add them
        </LoadingButton>
      )}
      <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
        Mention anyway
      </Button>
    </div>
  );
}
