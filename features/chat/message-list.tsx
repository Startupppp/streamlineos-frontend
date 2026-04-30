"use client";

import { Fragment, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowDown, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDateLabel } from "./chat-helpers";
import type { Message } from "./chat-types";
import { ChatBubble } from "./chat-bubble";

interface GroupedMessages {
  date: string;
  messages: Message[];
}

interface MessageItemProps {
  msg: Message;
  isOwn: boolean;
  showHeader: boolean;
  editingMessageId: number | undefined;
  editInput: string;
  currentUserId: string;
  onEditInputChange: (value: string) => void;
  onStartEdit: (msg: Message) => void;
  onCancelEdit: () => void;
  onSaveEdit: (messageId: number) => void;
  onReply: (msg: Message) => void;
  onDelete: (messageId: number) => void;
  onReact: (messageId: number, emoji: string) => void;
}

function MessageItem({
  msg,
  isOwn,
  showHeader,
  editingMessageId,
  editInput,
  currentUserId,
  onEditInputChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onReply,
  onDelete,
  onReact,
}: MessageItemProps) {
  const handleStartEdit = useCallback(() => onStartEdit(msg), [msg, onStartEdit]);
  const handleSaveEdit = useCallback(() => onSaveEdit(msg.id), [msg.id, onSaveEdit]);
  const handleReply = useCallback(() => onReply(msg), [msg, onReply]);
  const handleDelete = useCallback(() => onDelete(msg.id), [msg.id, onDelete]);
  const handleReact = useCallback((emoji: string) => onReact(msg.id, emoji), [msg.id, onReact]);
  return (
    <ChatBubble
      message={msg}
      isOwn={isOwn}
      showSender={showHeader}
      isEditing={editingMessageId === msg.id}
      editInput={editingMessageId === msg.id ? editInput : ""}
      currentUserId={currentUserId}
      onEditInputChange={onEditInputChange}
      onStartEdit={handleStartEdit}
      onCancelEdit={onCancelEdit}
      onSaveEdit={handleSaveEdit}
      onReply={handleReply}
      onDelete={handleDelete}
      onReact={handleReact}
    />
  );
}

export interface MessageListProps {
  groupedMessages: GroupedMessages[];
  messages: Message[];
  isLoading: boolean;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  currentUserId: string;
  channelId: number;
  displayName: string;
  channelType: string | undefined;
  editingMessage: Message | null;
  editInput: string;
  onEditInputChange: (value: string) => void;
  onStartEdit: (msg: Message) => void;
  onCancelEdit: () => void;
  onSaveEdit: (messageId: number) => void;
  onReply: (msg: Message) => void;
  onDelete: (messageId: number) => void;
  onReact: (messageId: number, emoji: string) => void;
  showScrollBtn: boolean;
  scrollToBottom: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

export function MessageList({
  groupedMessages,
  messages,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  currentUserId,
  channelId,
  displayName,
  channelType,
  editingMessage,
  editInput,
  onEditInputChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onReply,
  onDelete,
  onReact,
  showScrollBtn,
  scrollToBottom,
  messagesEndRef,
  scrollContainerRef,
  onScroll,
}: MessageListProps) {
  const handleFetchNextPage = useCallback(() => fetchNextPage(), [fetchNextPage]);

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative"
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 50%, hsl(var(--muted) / 0.3) 0%, transparent 70%)",
      }}
      ref={scrollContainerRef}
      onScroll={onScroll}
    >
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
          <p className="text-[13px] text-muted-foreground mt-3">Loading messages...</p>
        </div>
      ) : (
        <div className="py-2 px-3 sm:px-5 max-w-[900px] mx-auto">
          {hasNextPage && (
            <div className="flex justify-center pb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleFetchNextPage}
                disabled={isFetchingNextPage}
                className="h-7 text-[12px] rounded-full px-4"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                    Loading...
                  </>
                ) : (
                  "Load older messages"
                )}
              </Button>
            </div>
          )}

          {groupedMessages.map((group) => (
            <Fragment key={group.date}>
              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-border/40" />
                <span className="text-[10px] font-semibold text-muted-foreground/60 bg-background px-2.5 py-0.5 rounded-full border border-border/30">
                  {group.date}
                </span>
                <div className="flex-1 h-px bg-border/40" />
              </div>

              {group.messages.map((msg, idx) => {
                if (msg.messageType === "system") {
                  return (
                    <div
                      key={msg.id}
                      className="flex justify-center my-2"
                    >
                      <span className="text-[11px] text-muted-foreground/70 bg-muted/30 px-2.5 py-0.5 rounded-full italic">
                        {msg.content}
                      </span>
                    </div>
                  );
                }

                const isOwn = msg.senderId === currentUserId;
                const prevMsg = idx > 0 ? group.messages[idx - 1] : null;
                const isSameSender =
                  prevMsg?.senderId === msg.senderId &&
                  !prevMsg?.isDeleted &&
                  prevMsg?.messageType !== "system";
                const timeDiff =
                  prevMsg?.createdAt && msg.createdAt
                    ? new Date(msg.createdAt).getTime() -
                      new Date(prevMsg.createdAt).getTime()
                    : 0;
                const showHeader = !isSameSender || timeDiff > 2 * 60 * 1000;

                return (
                  <MessageItem
                    key={msg.id}
                    msg={msg}
                    isOwn={isOwn}
                    showHeader={showHeader}
                    editingMessageId={editingMessage?.id}
                    editInput={editInput}
                    currentUserId={currentUserId}
                    onEditInputChange={onEditInputChange}
                    onStartEdit={onStartEdit}
                    onCancelEdit={onCancelEdit}
                    onSaveEdit={onSaveEdit}
                    onReply={onReply}
                    onDelete={onDelete}
                    onReact={onReact}
                  />
                );
              })}
            </Fragment>
          ))}

          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-gold/15 to-gold/5 flex items-center justify-center mb-3">
                <Send className="h-5 w-5 text-gold" />
              </div>
              <h4 className="text-[14px] font-semibold mb-0.5">
                {channelType === "DIRECT"
                  ? `Start a conversation with ${displayName}`
                  : `Welcome to #${displayName}`}
              </h4>
              <p className="text-[12px] text-muted-foreground max-w-xs text-center">
                Send a message to get things started.
              </p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={scrollToBottom}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 h-8 rounded-full bg-background border border-border/60 shadow-lg flex items-center gap-1.5 px-3 hover:bg-muted transition-colors"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium">New messages</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
