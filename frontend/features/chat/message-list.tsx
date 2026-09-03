"use client";

import { Fragment, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, ArrowDown } from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";
import type { Message } from "./chat-types";
import { ChatBubble } from "./chat-bubble";
import { EntityActionsProvider } from "./entity-actions-context";

interface GroupedMessages {
  date: string;
  messages: Message[];
}

interface MessageItemProps {
  msg: Message;
  isOwn: boolean;
  showHeader: boolean;
  currentUserId: string;
  editingMessageId: number | undefined;
  editInput: string;
  pinnedMessageIds: Set<number>;
  savedMessageIds: Set<number>;
  replyCountMap: Map<number, number>;
  onEditInputChange: (value: string) => void;
  onStartEdit: (msg: Message) => void;
  onCancelEdit: () => void;
  onSaveEdit: (messageId: number) => void;
  onReply: (msg: Message) => void;
  onOpenThread: (msg: Message) => void;
  onDelete: (messageId: number) => void;
  onReact: (messageId: number, emoji: string) => void;
  onPin: (messageId: number) => void;
  onUnpin: (messageId: number) => void;
  onSave: (messageId: number) => void;
  onUnsaveMsg: (messageId: number) => void;
  onForward: (msg: Message) => void;
  resolveUserName?: (
    userId: string | null,
    embedded?: { name?: string | null; email?: string | null } | null,
  ) => string;
}

const MessageItem = memo(function MessageItem({
  msg,
  isOwn,
  showHeader,
  currentUserId,
  editingMessageId,
  editInput,
  pinnedMessageIds,
  savedMessageIds,
  replyCountMap,
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
  onSave,
  onUnsaveMsg,
  onForward,
  resolveUserName,
}: MessageItemProps) {
  const handleStartEdit = useCallback(() => onStartEdit(msg), [msg, onStartEdit]);
  const handleSaveEdit = useCallback(() => onSaveEdit(msg.id), [msg.id, onSaveEdit]);
  const handleReply = useCallback(() => onReply(msg), [msg, onReply]);
  const handleOpenThread = useCallback(() => onOpenThread(msg), [msg, onOpenThread]);
  const handleDelete = useCallback(() => onDelete(msg.id), [msg.id, onDelete]);
  const handleReact = useCallback((emoji: string) => onReact(msg.id, emoji), [msg.id, onReact]);
  const handlePin = useCallback(() => onPin(msg.id), [msg.id, onPin]);
  const handleUnpin = useCallback(() => onUnpin(msg.id), [msg.id, onUnpin]);
  const handleSave = useCallback(() => onSave(msg.id), [msg.id, onSave]);
  const handleUnsaveMsg = useCallback(() => onUnsaveMsg(msg.id), [msg.id, onUnsaveMsg]);
  const handleForward = useCallback(() => onForward(msg), [msg, onForward]);
  return (
    <ChatBubble
      message={msg}
      isOwn={isOwn}
      showSender={showHeader}
      currentUserId={currentUserId}
      isEditing={editingMessageId === msg.id}
      editInput={editingMessageId === msg.id ? editInput : ""}
      isPinned={pinnedMessageIds.has(msg.id)}
      isSaved={savedMessageIds.has(msg.id)}
      replyCount={replyCountMap.get(msg.id)}
      onEditInputChange={onEditInputChange}
      onStartEdit={handleStartEdit}
      onCancelEdit={onCancelEdit}
      onSaveEdit={handleSaveEdit}
      onReply={handleReply}
      onOpenThread={handleOpenThread}
      onDelete={handleDelete}
      onReact={handleReact}
      onPin={handlePin}
      onUnpin={handleUnpin}
      onSave={handleSave}
      onUnsaveMsg={handleUnsaveMsg}
      onForward={handleForward}
      resolveUserName={resolveUserName}
    />
  );
});

interface MessageListProps {
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
  pinnedMessageIds: Set<number>;
  savedMessageIds: Set<number>;
  replyCountMap: Map<number, number>;
  firstUnreadMessageId?: number;
  onEditInputChange: (value: string) => void;
  onStartEdit: (msg: Message) => void;
  onCancelEdit: () => void;
  onSaveEdit: (messageId: number) => void;
  onReply: (msg: Message) => void;
  onOpenThread: (msg: Message) => void;
  onDelete: (messageId: number) => void;
  onReact: (messageId: number, emoji: string) => void;
  onPin: (messageId: number) => void;
  onUnpin: (messageId: number) => void;
  onSave: (messageId: number) => void;
  onUnsaveMsg: (messageId: number) => void;
  onForward: (msg: Message) => void;
  resolveUserName?: (
    userId: string | null,
    embedded?: { name?: string | null; email?: string | null } | null,
  ) => string;
  showScrollBtn: boolean;
  scrollToBottom: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

const ScrollToBottomButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function ScrollToBottomButton({ className, children, ...props }, ref) {
  return (
    <button ref={ref} className={className} {...props}>
      <ArrowDown className="h-3.5 w-3.5" />
      {children}
    </button>
  );
});

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
  pinnedMessageIds,
  savedMessageIds,
  replyCountMap,
  firstUnreadMessageId,
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
  onSave,
  onUnsaveMsg,
  onForward,
  resolveUserName,
  showScrollBtn,
  scrollToBottom,
  messagesEndRef,
  scrollContainerRef,
  onScroll,
}: MessageListProps) {
  const handleFetchNextPage = useCallback(() => fetchNextPage(), [fetchNextPage]);

  return (
    <EntityActionsProvider channelId={channelId} messages={messages}>
    <div className="flex-1 min-h-0 min-w-0 relative flex flex-col overflow-hidden">
      <ScrollArea
        hideScrollbar
        className="flex-1 min-h-0 min-w-0"
        viewportRef={scrollContainerRef}
        onViewportScroll={onScroll}
        viewportClassName="overscroll-contain"
      >
        <div
          className="min-h-full"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 50%, hsl(var(--muted) / 0.3) 0%, transparent 70%)",
          }}
        >
        {isLoading ? (
          <div className="py-4 px-3 sm:px-5 max-w-[900px] mx-auto w-full min-w-0 space-y-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`flex items-start gap-3 ${i % 3 === 2 ? "flex-row-reverse" : ""}`}>
                <div className="w-8 rounded-full bg-muted animate-pulse shrink-0" />
                <div className="space-y-1.5 max-w-[60%]">
                  <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                  <div className={`h-10 rounded-xl bg-muted animate-pulse ${i % 3 === 2 ? "w-40" : "w-56"}`} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className={cn(
              "min-h-full flex flex-col py-2 px-3 sm:px-5 max-w-[900px] mx-auto w-full min-w-0",
              messages.length > 0 ? "justify-end" : "justify-center",
            )}
          >
            {hasNextPage && (
              <div className="flex justify-center pb-3 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFetchNextPage}
                  disabled={isFetchingNextPage}
                  className="text-xs rounded-full px-4"
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
                <span className="text-micro font-semibold text-muted-foreground/60 bg-background px-2.5 py-0.5 rounded-full border border-border/30">
                  {group.date}
                </span>
                <div className="flex-1 h-px bg-border/40" />
              </div>

              {group.messages.map((msg, idx) => {
                const isOwn = msg.senderId === currentUserId;
                const prevMsg = idx > 0 ? group.messages[idx - 1] : null;
                const isSameSender =
                  prevMsg?.senderId === msg.senderId && !prevMsg?.isDeleted;
                const timeDiff =
                  prevMsg?.createdAt && msg.createdAt
                    ? new Date(msg.createdAt).getTime() -
                      new Date(prevMsg.createdAt).getTime()
                    : 0;
                const showHeader = !isSameSender || timeDiff > 2 * 60 * 1000;
                const showUnreadDivider = firstUnreadMessageId !== undefined && msg.id === firstUnreadMessageId;

                return (
                  <Fragment key={msg.id}>
                    {showUnreadDivider && (
                      <div className="flex items-center gap-3 my-2 px-2">
                        <div className="flex-1 h-px bg-status-danger-surface" />
                        <span className="text-micro font-bold text-status-danger-ink whitespace-nowrap px-2">New Messages</span>
                        <div className="flex-1 h-px bg-status-danger-surface" />
                      </div>
                    )}
                    <MessageItem
                      msg={msg}
                      isOwn={isOwn}
                      showHeader={showHeader}
                      currentUserId={currentUserId}
                      editingMessageId={editingMessage?.id}
                      editInput={editInput}
                      pinnedMessageIds={pinnedMessageIds}
                      savedMessageIds={savedMessageIds}
                      replyCountMap={replyCountMap}
                      onEditInputChange={onEditInputChange}
                      onStartEdit={onStartEdit}
                      onCancelEdit={onCancelEdit}
                      onSaveEdit={onSaveEdit}
                      onReply={onReply}
                      onOpenThread={onOpenThread}
                      onDelete={onDelete}
                      onReact={onReact}
                      onPin={onPin}
                      onUnpin={onUnpin}
                      onSave={onSave}
                      onUnsaveMsg={onUnsaveMsg}
                      onForward={onForward}
                      resolveUserName={resolveUserName}
                    />
                  </Fragment>
                );
              })}
            </Fragment>
          ))}

          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-gradient-info-wash-from to-gradient-info-wash-to flex items-center justify-center mb-3">
                <Send className="h-5 w-5 text-status-info-ink" />
              </div>
              <h4 className="text-sm font-semibold mb-0.5">
                {channelType === "DIRECT"
                  ? `Start a conversation with ${displayName}`
                  : `Welcome to #${displayName}`}
              </h4>
              <p className="text-xs text-muted-foreground max-w-xs text-center">
                Send a message to get things started.
              </p>
            </div>
          )}

          <div ref={messagesEndRef} className="h-px shrink-0" aria-hidden="true" />
        </div>
      )}
        </div>
      </ScrollArea>

      <AnimatePresence>
        {showScrollBtn && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
          >
            <ScrollToBottomButton
              type="button"
              onClick={() => scrollToBottom()}
              className="pointer-events-auto h-8 rounded-full bg-background border border-border/60 shadow-lg flex items-center gap-1.5 px-3 hover:bg-muted transition-colors"
            >
              <span className="text-dense font-medium">New messages</span>
            </ScrollToBottomButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </EntityActionsProvider>
  );
}
