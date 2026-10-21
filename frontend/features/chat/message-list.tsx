"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, ArrowDown } from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/chat";
import { MessageItem } from "./message-list-item";
import { useOlderHistoryLoader } from "./use-chat-scroll";
import { ErrorState } from "@/components/shared/error-state";
import { EntityActionsProvider } from "./entity-actions-context";
import { ChannelJoinState } from "./channel-join-state";
import type { ChannelJoinRequired } from "./chat-helpers";


interface GroupedMessages {
  date: string;
  messages: Message[];
}

interface MessageListProps {
  groupedMessages: GroupedMessages[];
  messages: Message[];
  isLoading: boolean;
  /**
   * The history read failed. Without this the list fell through to its empty
   * layout, so a 500 or a 403 on `GET /chat/channels/:id/messages` was
   * indistinguishable from a channel nobody has written in yet.
   */
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  joinRequired?: ChannelJoinRequired | null;
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
  onOpenThread: (messageId: number) => void;
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
  latestLabel?: string;
  scrollToBottom: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  scrollToMessageId?: number | null;
}

function useMessageAnchor(
  messageId: number | null | undefined,
  groupedMessages: GroupedMessages[],
): number | null {
  const isPresent = useMemo(
    () =>
      messageId != null &&
      groupedMessages.some((group) =>
        group.messages.some((message) => message.id === messageId),
      ),
    [groupedMessages, messageId],
  );

  useEffect(() => {
    if (!messageId || !isPresent) return;
    let innerFrame = 0;
    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => {
        document
          .getElementById(`message-${messageId}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
    return () => {
      cancelAnimationFrame(outerFrame);
      cancelAnimationFrame(innerFrame);
    };
  }, [messageId, isPresent]);

  return isPresent && messageId ? messageId : null;
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
  isError,
  errorMessage,
  onRetry,
  joinRequired,
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
  latestLabel = "New messages",
  scrollToBottom,
  messagesEndRef,
  scrollContainerRef,
  onScroll,
  scrollToMessageId,
}: MessageListProps) {
  const handleRetry = useCallback(() => onRetry?.(), [onRetry]);
  const handleScrollToBottom = useCallback(
    () => scrollToBottom(),
    [scrollToBottom],
  );
  const highlightedMessageId = useMessageAnchor(scrollToMessageId, groupedMessages);
  const firstMessageId = groupedMessages[0]?.messages[0]?.id ?? null;
  const renderedMessageCount = useMemo(
    () => groupedMessages.reduce((sum, group) => sum + group.messages.length, 0),
    [groupedMessages],
  );
  const { sentinelRef: olderHistorySentinelRef, loadOlder: handleLoadOlder } =
    useOlderHistoryLoader({
      scrollContainerRef,
      firstMessageId,
      messageCount: renderedMessageCount,
      isLoading,
      isAwayFromLatest: showScrollBtn,
      hasNextPage,
      isFetchingNextPage,
      fetchNextPage,
    });
  const handleOlderFallbackClick = useCallback(() => {
    scrollContainerRef.current?.focus({ preventScroll: true });
    handleLoadOlder();
  }, [scrollContainerRef, handleLoadOlder]);

  if (joinRequired) return <ChannelJoinState channelId={channelId} channelName={joinRequired.channelName} />;

  /*
   * Before the empty layout, and before the entity-action provider mounts a
   * query of its own: a channel whose history could not be read has nothing to
   * resolve references against. The four sibling chat surfaces
   * (channel-sidebar, channels-discovery-page, saved-messages-panel,
   * shared-files-panel) already branch here; the timeline was the one that
   * rendered a failure as an ordinary empty conversation.
   */
  if (isError) {
    return (
      <div className="flex-1 min-h-0 min-w-0 flex flex-col justify-center p-4">
        <ErrorState
          compact
          title="Couldn't load this conversation"
          description={
            errorMessage ??
            "The message history could not be read. Please try again."
          }
          onRetry={handleRetry}
        />
      </div>
    );
  }

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
                "radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--muted) 30%, transparent) 0%, transparent 70%)",
            }}
          >
            {isLoading ? (
              <div
                className="py-4 px-3 sm:px-5 max-w-[900px] mx-auto w-full min-w-0 space-y-5"
                aria-busy="true"
              >
                <span role="status" className="sr-only">
                  Loading messages…
                </span>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 ${i % 3 === 2 ? "flex-row-reverse" : ""}`}
                  >
                    <div className="w-8 rounded-full bg-muted animate-pulse shrink-0" />
                    <div className="space-y-1.5 max-w-[60%]">
                      <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                      <div
                        className={`h-10 rounded-xl bg-muted animate-pulse ${i % 3 === 2 ? "w-40" : "w-56"}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className={cn(
                  "min-h-full flex flex-col py-2 px-3 sm:px-5 max-w-[900px] mx-auto w-full min-w-0 pb-14 sm:pb-2",
                  messages.length > 0 ? "justify-end" : "justify-center",
                )}
              >
                <div
                  ref={olderHistorySentinelRef}
                  data-older-history-sentinel
                  className="flex shrink-0 justify-center"
                >
                  {hasNextPage && !isFetchingNextPage ? (
                    <button
                      type="button"
                      onClick={handleOlderFallbackClick}
                      className="sr-only focus:not-sr-only focus:mb-2 focus:rounded-md focus:border focus:border-border focus:bg-card focus:px-3 focus:py-1.5 focus:text-sm focus:text-foreground"
                    >
                      Load older messages
                    </button>
                  ) : null}
                </div>
                {isFetchingNextPage && (
                  <p
                    role="status"
                    aria-live="polite"
                    className="shrink-0 pb-3 text-center text-xs text-muted-foreground"
                  >
                    Loading older messages…
                  </p>
                )}

                {groupedMessages.map((group) => (
                  <Fragment key={group.date}>
                    <div className="flex items-center gap-3 my-3">
                      <div className="flex-1 h-px bg-border/40" />
                      <span className="text-micro font-semibold text-muted-foreground bg-background px-2.5 py-0.5 rounded-full border border-border/30">
                        {group.date}
                      </span>
                      <div className="flex-1 h-px bg-border/40" />
                    </div>

                    {group.messages.map((msg, idx) => {
                      const isOwn = msg.senderId === currentUserId;
                      const prevMsg = idx > 0 ? group.messages[idx - 1] : null;
                      const isSameSender =
                        prevMsg?.senderId === msg.senderId &&
                        !prevMsg?.isDeleted;
                      const timeDiff =
                        prevMsg?.createdAt && msg.createdAt
                          ? new Date(msg.createdAt).getTime() -
                            new Date(prevMsg.createdAt).getTime()
                          : 0;
                      const showHeader =
                        !isSameSender || timeDiff > 2 * 60 * 1000;
                      const showUnreadDivider =
                        firstUnreadMessageId !== undefined &&
                        msg.id === firstUnreadMessageId;

                      return (
                        <Fragment key={msg.id}>
                          {showUnreadDivider && (
                            <div className="flex items-center gap-3 my-2 px-2">
                              <div className="flex-1 h-px bg-status-danger-surface" />
                              <span className="text-micro font-bold text-status-danger-ink whitespace-nowrap px-2">
                                New Messages
                              </span>
                              <div className="flex-1 h-px bg-status-danger-surface" />
                            </div>
                          )}
                          <div
                            data-anchored={
                              msg.id === highlightedMessageId || undefined
                            }
                            className={cn(
                              msg.id === highlightedMessageId &&
                                "rounded-lg bg-primary/5 ring-1 ring-primary/30",
                            )}
                          >
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
                          </div>
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

                <div
                  ref={messagesEndRef}
                  className="h-px shrink-0"
                  aria-hidden="true"
                />
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
              aria-live="polite"
            >
              <ScrollToBottomButton
                type="button"
                onClick={handleScrollToBottom}
                className="pointer-events-auto h-8 rounded-full bg-background border border-border/60 shadow-lg flex items-center gap-1.5 px-3 hover:bg-muted transition-colors"
              >
                <span className="text-dense font-medium">{latestLabel}</span>
              </ScrollToBottomButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </EntityActionsProvider>
  );
}
