"use client";

import { useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AtSign,
  FileText,
  Loader2,
  Paperclip,
  Reply,
  Send,
  Smile,
  X,
} from "lucide-react";
import { cn, resolveImageUrl } from "@/lib/utils";
import {
  formatFileSize,
  getFileColor,
  getFileExt,
  getInitials,
} from "./chat-helpers";
import type { Message } from "./chat-types";
import { EmojiGrid } from "./emoji-grid";
import type { UseMutationResult } from "@tanstack/react-query";

type PendingAttachment = {
  fileName: string;
  fileUrl: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
};

type OrgUser = {
  id: string;
  name?: string | null;
  image?: string | null;
  role?: string | null;
};

interface MentionItemProps {
  user: OrgUser;
  idx: number;
  mentionIndex: number;
  onInsert: (name: string) => void;
}

function MentionItem({ user, idx, mentionIndex, onInsert }: MentionItemProps) {
  const handleClick = useCallback(() => onInsert(user.name ?? ""), [user.name, onInsert]);
  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/40 transition-colors",
        idx === mentionIndex && "bg-blue-500/10"
      )}
    >
      <Avatar className="h-6 w-6">
        <AvatarImage src={resolveImageUrl(user.image)} />
        <AvatarFallback className="text-[8px]">{getInitials(user.name)}</AvatarFallback>
      </Avatar>
      <span className="text-[13px] font-medium">{user.name}</span>
      <span className="text-[11px] text-muted-foreground ml-auto">{user.role}</span>
    </button>
  );
}

interface PendingAttachmentItemProps {
  att: PendingAttachment;
  idx: number;
  onRemove: (idx: number) => void;
}

function PendingAttachmentItem({ att, idx, onRemove }: PendingAttachmentItemProps) {
  const handleRemove = useCallback(() => onRemove(idx), [idx, onRemove]);
  const colors = getFileColor(att.fileName);
  return (
    <div className="relative group flex items-center gap-2.5 bg-background border border-border rounded-xl px-3 py-2 shadow-sm">
      {att.mimeType.startsWith("image/") ? (
        <Image
          src={att.fileUrl}
          alt={att.fileName}
          width={44}
          height={44}
          unoptimized
          className="h-11 w-11 rounded-lg object-cover border border-border/30"
        />
      ) : (
        <div className={cn("h-11 w-11 rounded-lg flex flex-col items-center justify-center relative", colors.bg)}>
          <FileText className={cn("h-5 w-5", colors.text)} />
          <span className={cn("text-[7px] font-bold text-white px-1 rounded mt-0.5", colors.badge)}>
            {getFileExt(att.fileName)}
          </span>
        </div>
      )}
      <div className="min-w-0 max-w-[140px]">
        <p className="text-[12px] font-medium truncate">{att.fileName}</p>
        <p className="text-[10px] text-muted-foreground">{formatFileSize(att.fileSize)}</p>
      </div>
      <button
        onClick={handleRemove}
        aria-label="Remove attachment"
        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

interface MessageInputProps {

  channelId: number;
  displayName: string;
  channelType: string | undefined;

  messageInput: string;
  setMessageInput: (v: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;

  replyTo: Message | null;
  setReplyTo: (msg: Message | null) => void;

  pendingAttachments: PendingAttachment[];
  setPendingAttachments: React.Dispatch<React.SetStateAction<PendingAttachment[]>>;
  uploading: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;

  showEmojiPicker: boolean;
  setShowEmojiPicker: React.Dispatch<React.SetStateAction<boolean>>;
  emojiRef: React.RefObject<HTMLDivElement | null>;
  insertEmoji: (emoji: string) => void;

  showMentions: boolean;
  setShowMentions: React.Dispatch<React.SetStateAction<boolean>>;
  mentionQuery: string;
  mentionIndex: number;
  setMentionIndex: React.Dispatch<React.SetStateAction<number>>;
  filteredMentions: OrgUser[];
  insertMention: (name: string) => void;

  typingText: string | null;

  sendMessage: { isPending: boolean };
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export function MessageInput({
  channelId,
  displayName,
  channelType,
  messageInput,
  setMessageInput,
  inputRef,
  fileInputRef,
  replyTo,
  setReplyTo,
  pendingAttachments,
  setPendingAttachments,
  uploading,
  onFileSelect,
  showEmojiPicker,
  setShowEmojiPicker,
  emojiRef,
  insertEmoji,
  showMentions,
  setShowMentions,
  mentionQuery,
  mentionIndex,
  setMentionIndex,
  filteredMentions,
  insertMention,
  typingText,
  sendMessage,
  onSend,
  onKeyDown,
  onInputChange,
}: MessageInputProps) {
  const handleCancelReply = useCallback(() => setReplyTo(null), [setReplyTo]);
  const handleOpenFileInput = useCallback(() => { fileInputRef.current?.click(); }, [fileInputRef]);
  const handleToggleEmoji = useCallback(() => {
    setShowEmojiPicker((p) => !p);
    setShowMentions(false);
  }, [setShowEmojiPicker, setShowMentions]);
  const handleInsertMentionAt = useCallback(() => {
    const el = inputRef.current;
    if (el) {
      const pos = el.selectionStart ?? messageInput.length;
      const newVal = messageInput.slice(0, pos) + "@" + messageInput.slice(pos);
      setMessageInput(newVal);
      setShowMentions(true);
      setShowEmojiPicker(false);
      setTimeout(() => { el.focus(); el.setSelectionRange(pos + 1, pos + 1); }, 0);
    }
  }, [inputRef, messageInput, setMessageInput, setShowMentions, setShowEmojiPicker]);
  const handleRemoveAttachment = useCallback((idx: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== idx));
  }, [setPendingAttachments]);

  return (
    <>

      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/30 overflow-hidden bg-muted/20"
          >
            <div className="flex items-center gap-3 px-4 py-2 max-w-[900px] mx-auto">
              <div className="w-1 h-9 rounded-full bg-blue-500 shrink-0" />
              <Reply className="h-4 w-4 text-blue-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-blue-600">
                  Replying to {replyTo.sender?.name}
                </p>
                <p className="text-[12px] text-muted-foreground truncate">
                  {replyTo.content}
                </p>
              </div>
              <button
                onClick={handleCancelReply}
                className="p-1 hover:bg-muted rounded-md"
                aria-label="Cancel reply"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-3 sm:px-5 py-2 border-t border-border/40 shrink-0 bg-card/50 relative">
        <div className="max-w-[900px] mx-auto">

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
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/30">
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

          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                ref={emojiRef}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute bottom-full left-3 sm:left-6 mb-1 z-20"
              >
                <EmojiGrid onSelect={insertEmoji} />
              </motion.div>
            )}
          </AnimatePresence>

          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {pendingAttachments.map((att, idx) => (
                <PendingAttachmentItem
                  key={idx}
                  att={att}
                  idx={idx}
                  onRemove={handleRemoveAttachment}
                />
              ))}
              {uploading && (
                <div className="flex items-center gap-2 bg-muted/40 border border-border/40 rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-[11px] text-muted-foreground">Uploading...</span>
                </div>
              )}
            </div>
          )}

          {typingText && (
            <div className="px-4 pb-1">
              <span className="text-xs text-muted-foreground/70 italic animate-pulse">
                {typingText}
              </span>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-background shadow-md focus-within:border-blue-500/50 focus-within:shadow-lg transition-all">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.doc,.docx,.xls,.xlsx"
              onChange={onFileSelect}
              className="hidden"
              aria-label="Upload file"
            />
            <textarea
              ref={inputRef}
              value={messageInput}
              onChange={onInputChange}
              onKeyDown={onKeyDown}
              placeholder={`Message ${channelType === "DIRECT" ? displayName : "#" + displayName}...`}
              rows={1}
              className="w-full bg-transparent text-[14px] resize-none px-4 pt-3 pb-1 focus:outline-none placeholder:text-muted-foreground/60 min-h-[40px] max-h-[160px]"
            />
            <div className="flex items-center justify-between px-3 py-1.5">
              <div className="flex items-center gap-0.5">
                <button
                  onClick={handleOpenFileInput}
                  disabled={uploading}
                  className={cn(
                    "p-2 rounded-lg hover:bg-muted/60 transition-colors",
                    uploading
                      ? "text-blue-600 animate-pulse"
                      : "text-muted-foreground/70 hover:text-foreground"
                  )}
                  title="Attach file (max 10MB)"
                  aria-label="Attach file"
                >
                  <Paperclip className="h-[18px] w-[18px]" />
                </button>
                <button
                  onClick={handleToggleEmoji}
                  className={cn(
                    "p-2 rounded-lg hover:bg-muted/60 transition-colors",
                    showEmojiPicker
                      ? "text-blue-600 bg-muted/50"
                      : "text-muted-foreground/70 hover:text-foreground"
                  )}
                  title="Emoji"
                  aria-label="Add emoji"
                >
                  <Smile className="h-[18px] w-[18px]" />
                </button>
                <button
                  onClick={handleInsertMentionAt}
                  className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground/70 hover:text-foreground transition-colors"
                  title="Mention someone"
                  aria-label="Mention someone"
                >
                  <AtSign className="h-[18px] w-[18px]" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground/50 hidden sm:inline">
                  Shift+Enter for new line
                </span>
                <button
                  onClick={onSend}
                  disabled={
                    (!messageInput.trim() && pendingAttachments.length === 0) ||
                    sendMessage.isPending
                  }
                  aria-label="Send"
                  className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center transition-all",
                    messageInput.trim() || pendingAttachments.length > 0
                      ? "bg-gradient-to-r from-blue-500 to-[#d4a544] text-white shadow-md hover:shadow-lg hover:scale-105"
                      : "bg-muted/50 text-muted-foreground/30 cursor-not-allowed"
                  )}
                >
                  {sendMessage.isPending ? (
                    <Loader2 className="h-[18px] w-[18px] animate-spin" />
                  ) : (
                    <Send className="h-[18px] w-[18px]" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
