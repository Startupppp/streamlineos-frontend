"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { SendIcon, XIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import React from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useThreadReplies, useSendThreadReply, useChatOrgUsers } from "@/hooks/api";
import { buildChatUserMap, resolveChatUserName } from "./chat-helpers";
import { ThreadMessage } from "./thread-message";
import { panelRevealLabel, usePanelRenderWindow } from "./panel-render-window";

const ThreadCloseButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function ThreadCloseButton({ className, ...props }, ref) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button ref={ref} {...hoverHandlers} className={className} {...props}>
      <XIcon ref={iconRef} size={16} className="text-muted-foreground" />
    </button>
  );
});

const ThreadSendButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { isPending: boolean }
>(function ThreadSendButton({ className, isPending, ...props }, ref) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button ref={ref} {...hoverHandlers} className={className} {...props}>
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <SendIcon ref={iconRef} size={14} />
      )}
    </button>
  );
});

export function ThreadPanel({
  channelId,
  parentMessageId,
  currentUserId,
  onClose,
}: {
  channelId: number;
  parentMessageId: number;
  currentUserId: string;
  onClose: () => void;
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useThreadReplies(channelId, parentMessageId);

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
      await sendReply.mutateAsync({ content });
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      setInput(content);
      toast.error(getErrorMessage(error));
    }
  }, [input, sendReply]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
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
  const visibleReplies = useMemo(
    () => replies.slice(renderWindow.windowStart),
    [replies, renderWindow.windowStart],
  );

  return (
    <div className="flex flex-col h-full w-80 border-l border-border/40 bg-card/50">
      <div className="h-[56px] px-4 border-b border-border/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-bold">Thread</h3>
        </div>
        <ThreadCloseButton
          onClick={onClose}
          className="p-1.5 hover:bg-muted rounded-lg"
          aria-label="Close thread"
        />
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
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
                  <span className="text-micro font-semibold text-muted-foreground/60 whitespace-nowrap">
                    {replies.length} {replies.length === 1 ? "reply" : "replies"}
                  </span>
                  <div className="flex-1 h-px bg-border/40" />
                </div>
              </>
            )}

            {renderWindow.hasMore && (
              <div className="flex justify-center pb-2">
                <button
                  type="button"
                  onClick={renderWindow.onLoadMore}
                  disabled={isFetchingNextPage}
                  className="text-dense text-primary hover:underline disabled:opacity-50"
                >
                  {panelRevealLabel(
                    renderWindow,
                    total,
                    isFetchingNextPage,
                    "Load older replies",
                  )}
                </button>
              </div>
            )}

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
                  role="listitem"
                  aria-posinset={renderWindow.windowStart + index + 1}
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

            <div ref={bottomRef} />
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
            placeholder="Reply in thread..."
            rows={1}
            className="flex-1 bg-transparent text-label resize-none focus:outline-none min-h-[22px] max-h-[120px] leading-[1.5]"
          />
          <ThreadSendButton
            onClick={handleSend}
            disabled={!input.trim() || sendReply.isPending}
            isPending={sendReply.isPending}
            className={cn(
              "shrink-0 h-7 w-7 rounded-lg flex items-center justify-center transition-colors",
              input.trim()
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground"
            )}
            aria-label="Send reply"
          />
        </div>
      </div>
    </div>
  );
}
