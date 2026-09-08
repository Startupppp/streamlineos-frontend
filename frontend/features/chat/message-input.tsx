"use client";

import { useCallback } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  AtSign,
  Bold,
  Code,
  Italic,
  Loader2,
  Paperclip,
  Send,
  Smile,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TicketSearchResult } from "@/hooks/api/build";
import { ChatPopoverFallback } from "./chat-lazy-fallbacks";
import { getChatMobileComposerInsetClassName } from "@/components/layout/mobile/chat-mobile-chrome-layout";
import type { MessageInputProps } from "./message-input-types";
import {
  ChatAttachmentsRow,
  ChatMentionSuggestionsOverlay,
  ChatReplyPreview,
} from "./message-input-items";

const TicketMentionPicker = dynamic(
  () =>
    import("./ticket-mention-picker").then((m) => ({
      default: m.TicketMentionPicker,
    })),
  { ssr: false, loading: () => <ChatPopoverFallback label="Loading ticket picker" /> },
);

const EmojiGrid = dynamic(
  () => import("./emoji-grid").then((m) => ({ default: m.EmojiGrid })),
  { ssr: false, loading: () => <ChatPopoverFallback label="Loading emoji picker" /> },
);

export type { MessageInputProps } from "./message-input-types";

export function MessageInput({
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
  mentionIndex,
  filteredMentions,
  insertMention,
  showTicketPicker,
  ticketQuery,
  ticketSelectedIndex,
  onTicketSelect,
  typingText,
  sendMessage,
  onSend,
  onKeyDown,
  onInputChange,
  onFilesSelected,
}: MessageInputProps) {
  const formatSelection = useCallback((marker: string, block = false) => {
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.slice(start, end);
    const formatted = block
      ? `\`\`\`\n${selected || "code"}\n\`\`\``
      : `${marker}${selected || "text"}${marker}`;
    const newValue = el.value.slice(0, start) + formatted + el.value.slice(end);
    setMessageInput(newValue);
    setTimeout(() => {
      el.setSelectionRange(start + marker.length, start + marker.length + (selected || "text").length);
      el.focus();
    }, 0);
  }, [inputRef, setMessageInput]);

  const handleFormatBold = useCallback(() => formatSelection("**"), [formatSelection]);
  const handleFormatItalic = useCallback(() => formatSelection("*"), [formatSelection]);
  const handleFormatCode = useCallback(() => formatSelection("`"), [formatSelection]);

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

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith("image/"));
    if (imageItems.length === 0) return;
    e.preventDefault();
    const files = imageItems.map(item => item.getAsFile()).filter((f): f is File => f !== null);
    if (files.length > 0 && onFilesSelected) {
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  return (
    <>
      <ChatReplyPreview replyTo={replyTo} onCancel={handleCancelReply} />

      <div
        className={cn(
          "relative shrink-0 border-t border-border/40 bg-card/50 px-3 pt-2 pb-2 sm:px-5",
          getChatMobileComposerInsetClassName(),
        )}
      >
        <div className="max-w-[900px] mx-auto">

          <ChatMentionSuggestionsOverlay
            showMentions={showMentions}
            filteredMentions={filteredMentions}
            mentionIndex={mentionIndex}
            insertMention={insertMention}
          />

          {showTicketPicker && (
            <TicketMentionPicker
              query={ticketQuery}
              onSelect={onTicketSelect}
              selectedIndex={ticketSelectedIndex}
              className="left-3 sm:left-6"
            />
          )}

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

          <ChatAttachmentsRow
            pendingAttachments={pendingAttachments}
            onRemove={handleRemoveAttachment}
            uploading={uploading}
          />

          {typingText && (
            <div className="px-4 pb-1">
              <span className="text-xs text-muted-foreground/70 italic animate-pulse">
                {typingText}
              </span>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-background shadow-md focus-within:border-status-info-rule focus-within:shadow-lg transition-all">
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
              onPaste={handlePaste}
              placeholder={`Message ${channelType === "DIRECT" ? displayName : "#" + displayName}...`}
              rows={1}
              className="w-full bg-transparent text-sm resize-none px-4 pt-3 pb-1 focus:outline-none placeholder:text-muted-foreground/60 min-h-[40px] max-h-[160px]"
            />
            <div className="flex items-center justify-between px-3 py-1.5">
              <div className="flex items-center gap-0.5">
                <button
                  onClick={handleOpenFileInput}
                  disabled={uploading}
                  className={cn(
                    "p-2 rounded-lg hover:bg-muted/60 transition-colors",
                    uploading
                      ? "text-status-info-ink animate-pulse"
                      : "text-muted-foreground/70 hover:text-foreground",
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
                      ? "text-status-info-ink bg-muted/50"
                      : "text-muted-foreground/70 hover:text-foreground",
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
                <div className="w-px h-4 bg-border/40 mx-0.5" />
                <button
                  onClick={handleFormatBold}
                  className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground/70 hover:text-foreground transition-colors font-bold"
                  title="Bold (**text**)"
                  aria-label="Bold"
                >
                  <Bold className="h-[16px] w-[16px]" />
                </button>
                <button
                  onClick={handleFormatItalic}
                  className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground/70 hover:text-foreground transition-colors"
                  title="Italic (*text*)"
                  aria-label="Italic"
                >
                  <Italic className="h-[16px] w-[16px]" />
                </button>
                <button
                  onClick={handleFormatCode}
                  className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground/70 hover:text-foreground transition-colors font-mono"
                  title="Inline code (`code`)"
                  aria-label="Code"
                >
                  <Code className="h-[16px] w-[16px]" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-micro text-muted-foreground/50 hidden sm:inline">
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
                      ? "bg-gradient-to-r from-gradient-info-from to-gradient-gold-to text-white shadow-md hover:shadow-lg hover:scale-105"
                      : "bg-muted/50 text-muted-foreground/30 cursor-not-allowed",
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
