"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { XIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useThreadReplies, useSendThreadReply } from "@/hooks/api/chat-search";
import { useChatOrgUsers } from "@/hooks/api/chat-core-read";
import { buildChatUserMap, resolveChatUserName } from "./chat-helpers";
import { ThreadMessage } from "./thread-message";
import { panelRevealLabel, usePanelRenderWindow } from "./panel-render-window";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";

export function ThreadPanel({
  channelId,
  parentMessageId,
  currentUserId,
  onClose,
  highlightedReplyId = null,
}: {
  channelId: number;
  parentMessageId: number;
  currentUserId: string;
  onClose: () => void;
  highlightedReplyId?: number | null;
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useThreadReplies(channelId, parentMessageId);

  useEffect(() => {
    if (isLoading) return;
    const viewport = viewportRef.current;
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }, [isLoading, parentMessageId]);

  const sendReply = useSendThreadReply(channelId, parentMessageId);
  const { data: orgUsers } = useChatOrgUsers();
  const chatUserMap = useMemo(() => buildChatUserMap(orgUsers), [orgUsers]);
  const resolveUserName = useCallback(
    (
      userId: string | null,
      embedded?: { name?: string | null; email?: string | null } | null,
    ) => resolveChatUserName(userId, embedded, chatUserMap),
    [chatUserMap],
  );

  const parentMessage = data?.pages[0]?.parentMessage ?? null;
  const replies = useMemo(
    () => [...(data?.pages ?? [])].reverse().flatMap((p) => p.replies),
    [data],
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content) return;
    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    try {
      await sendReply.mutateAsync({ content, clientKey: crypto.randomUUID() });
      viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: "smooth" });
    } catch (error) {
      setInput(content);
      toast.error(getErrorMessage(error));
    }
  }, [input, sendReply]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const total = replies.length;
  const renderWindow = usePanelRenderWindow(
    total,
    hasNextPage === true,
    fetchNextPage,
    parentMessageId,
  );
  const highlightedIndex = useMemo(
    () =>
      highlightedReplyId === null
        ? -1
        : replies.findIndex((reply) => reply.id === highlightedReplyId),
    [replies, highlightedReplyId],
  );
  const windowStart =
    highlightedIndex >= 0
      ? Math.min(renderWindow.windowStart, highlightedIndex)
      : renderWindow.windowStart;
  const visibleReplies = useMemo(
    () => replies.slice(windowStart),
    [replies, windowStart],
  );
  const isHighlightedVisible = highlightedIndex >= 0;

  useEffect(() => {
    if (!isHighlightedVisible || highlightedReplyId === null) return;
    let innerFrame = 0;
    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => {
        document
          .getElementById(`thread-reply-${highlightedReplyId}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
    return () => {
      cancelAnimationFrame(outerFrame);
      cancelAnimationFrame(innerFrame);
    };
  }, [isHighlightedVisible, highlightedReplyId]);

  return (
    <div className="flex flex-col h-full w-80 border-l border-border/40 bg-card/50">
      <div className="h-[56px] px-4 border-b border-border/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-bold">Thread</h3>
        </div>
        <AnimatedIconButton
          type="button"
          icon={XIcon}
          iconSize={16}
          variant="ghost"
          onClick={onClose}
          className="size-8 rounded-lg p-0 text-muted-foreground"
          aria-label="Close thread"
        />
      </div>

      <ScrollArea className="flex-1" viewportRef={viewportRef}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10" aria-busy="true">
            <span role="status" className="sr-only">Loading thread…</span>
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          </div>
        ) : (
          <div className="py-2">
            {parentMessage && (
              <>
                <ThreadMessage
                  message={parentMessage}
                  currentUserId={currentUserId}
                  isParent
                  resolveUserName={resolveUserName}
                />
                <div className="mx-4 my-2 flex items-center gap-2">
                  <div className="flex-1 h-px bg-border/40" />
                  <span className="text-micro font-semibold text-muted-foreground whitespace-nowrap">
                    {replies.length} {replies.length === 1 ? "reply" : "replies"}
                  </span>
                  <div className="flex-1 h-px bg-border/40" />
                </div>
              </>
            )}

            <InfiniteScrollSentinel
              hasNextPage={renderWindow.hasMore}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={renderWindow.onLoadMore}
              label={panelRevealLabel(renderWindow, total, isFetchingNextPage, "Load older replies")}
              pending="Loading older replies…"
              className="py-1"
            />

            {replies.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mb-2">
                  <Send className="h-4 w-4 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  No replies yet. Start the thread.
                </p>
              </div>
            )}

            <div role="list" aria-label="Thread replies">
              {visibleReplies.map((reply, index) => (
                <div
                  key={reply.id}
                  id={`thread-reply-${reply.id}`}
                  role="listitem"
                  data-anchored={reply.id === highlightedReplyId || undefined}
                  className={cn(
                    reply.id === highlightedReplyId &&
                      "rounded-lg bg-primary/5 ring-1 ring-primary/30",
                  )}
                  aria-posinset={windowStart + index + 1}
                  aria-setsize={hasNextPage ? -1 : total}
                >
                  <ThreadMessage
                    message={reply}
                    currentUserId={currentUserId}
                    resolveUserName={resolveUserName}
                  />
                </div>
              ))}
            </div>

          </div>
        )}
      </ScrollArea>

      <div className="p-3 border-t border-border/40 shrink-0">
        <div className="flex items-end gap-2 rounded-xl border border-border/50 bg-background px-3 py-2 focus-within:border-status-info-rule transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            aria-label="Reply in thread"
            placeholder="Reply in thread..."
            rows={1}
            className="flex-1 bg-transparent text-label resize-none focus:outline-none min-h-[22px] max-h-[120px] leading-[1.5]"
          />
          <LoadingButton
            type="button"
            onClick={handleSend}
            disabled={!input.trim()}
            isPending={sendReply.isPending}
            className={cn(
              "size-7 shrink-0 rounded-lg p-0 transition-colors",
              input.trim()
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground"
            )}
            aria-label="Send reply"
          >
            {sendReply.isPending ? null : <Send className="size-3.5" />}
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}
