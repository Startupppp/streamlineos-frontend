"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { InfiniteData } from "@tanstack/react-query";
import { toast } from "sonner";
import { useChatMessageContext } from "@/hooks/api/chat-message-windows";
import { isApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import type { ChannelMember, Message, MessagesPage, SendMessageInput } from "@/types/chat";
import { getDateLabel, readChannelJoinRequired } from "./chat-helpers";
import { resolveFirstUnreadIndex } from "./chat-read-position";
import { flattenMessagePages } from "./message-page-merge";
import { resolveMessageWindowStart } from "./message-render-window";
import { useChatScroll } from "./use-chat-scroll";
import { useMessageAnchorTarget } from "./use-message-anchor-target";

const MESSAGE_UNAVAILABLE_COPY = "That message is no longer available";
const CONTEXT_END_THRESHOLD = 80;

interface MessageTimelineOptions {
  channelId: number;
  currentUserId: string;
  members: ChannelMember[] | undefined;
  anchorMessageId: number | null;
  onLeaveAnchor: (() => void) | undefined;
  history: {
    data: InfiniteData<MessagesPage> | undefined;
    isLoading: boolean;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => unknown;
  };
  send: {
    isPending: boolean;
    mutateAsync: (input: SendMessageInput) => Promise<unknown>;
  };
}

function groupByDate(messages: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  let currentDate = "";
  for (const msg of messages) {
    const dateStr = getDateLabel(msg.createdAt ? new Date(msg.createdAt) : new Date());
    let group = groups[groups.length - 1];
    if (!group || dateStr !== currentDate) {
      currentDate = dateStr;
      group = { date: dateStr, messages: [] };
      groups.push(group);
    }
    group.messages.push(msg);
  }
  return groups;
}

export function useMessageTimeline({
  channelId,
  currentUserId,
  members,
  anchorMessageId,
  onLeaveAnchor,
  history,
  send,
}: MessageTimelineOptions) {
  const mainMessages = useMemo(() => flattenMessagePages(history.data), [history.data]);
  const anchorInMain =
    anchorMessageId !== null && mainMessages.some((message) => message.id === anchorMessageId);
  const contextEnabled = anchorMessageId !== null && !anchorInMain;
  const context = useChatMessageContext(channelId, anchorMessageId ?? 0, contextEnabled);
  const showContext = contextEnabled && !history.isLoading;
  const contextMessages = useMemo(
    () =>
      showContext && context.data
        ? [...context.data.pages]
            .reverse()
            .flatMap((page) => page.messages)
            .filter((message) => !message.isDeleted || message.id === anchorMessageId)
        : null,
    [showContext, context.data, anchorMessageId],
  );
  const inContext = contextMessages !== null;
  const messages = contextMessages ?? mainMessages;

  const anchor = useMessageAnchorTarget({ channelId, anchorMessageId, messages });
  const leftAnchorRef = useRef<number | null>(null);
  useEffect(() => {
    if (anchorMessageId === null) leftAnchorRef.current = null;
  }, [anchorMessageId]);
  const dropAnchor = useCallback(() => {
    if (anchorMessageId === null || leftAnchorRef.current === anchorMessageId) return;
    leftAnchorRef.current = anchorMessageId;
    onLeaveAnchor?.();
  }, [anchorMessageId, onLeaveAnchor]);
  const { keepThreadOpen } = anchor;
  const leave = useCallback(() => {
    keepThreadOpen();
    dropAnchor();
  }, [keepThreadOpen, dropAnchor]);
  const { error: contextError, refetch: refetchContext } = context;
  useEffect(() => {
    if (!contextEnabled || !contextError || readChannelJoinRequired(contextError)) return;
    const toastId = `chat-message-context-${channelId}-${anchorMessageId}`;
    if (isApiError(contextError) && (contextError.status === 403 || contextError.status === 404)) {
      toast.error(MESSAGE_UNAVAILABLE_COPY, { id: toastId });
      dropAnchor();
      return;
    }
    function retryContext() {
      void refetchContext();
    }
    toast.error(getErrorMessage(contextError), {
      id: toastId,
      action: { label: "Try again", onClick: retryContext },
    });
    return () => {
      toast.dismiss(toastId);
    };
  }, [contextEnabled, contextError, refetchContext, dropAnchor, channelId, anchorMessageId]);

  const [revealed, setRevealed] = useState({ channelId, pages: 1 });

  /**
   * Every older page the reader asks for has to land INSIDE the render window,
   * or the fetch paints nothing: `messages` is oldest-first, so a 50-row page
   * arrives at the front and `resolveMessageWindowStart`'s tail immediately
   * slices it back off. Both routes to an older page — the "Load older messages"
   * control and `useChatScroll`'s scroll-to-top auto-load, which calls
   * `fetchNextPage` directly — went through that, so the reader saw no change
   * and had to ask twice. The server page is 50 (`chat.schemas.ts`) against a
   * 60-row window, so one window page per network page covers it.
   */
  const renderPages = Math.max(
    revealed.channelId === channelId ? revealed.pages : 1,
    history.data?.pages.length ?? 0,
  );

  const firstUnreadIndex = useMemo(
    () => resolveFirstUnreadIndex(messages, members, currentUserId),
    [messages, members, currentUserId],
  );
  const keepVisibleIndex =
    firstUnreadIndex < 0 || anchor.anchorIndex < 0
      ? Math.max(firstUnreadIndex, anchor.anchorIndex)
      : Math.min(firstUnreadIndex, anchor.anchorIndex);
  const windowStart = inContext
    ? 0
    : resolveMessageWindowStart(messages.length, renderPages, keepVisibleIndex);
  const groupedMessages = useMemo(
    () => groupByDate(windowStart === 0 ? messages : messages.slice(windowStart)),
    [messages, windowStart],
  );
  const hasOlderHeld = windowStart > 0;

  const { fetchNextPage: fetchOlderContext, fetchPreviousPage, hasPreviousPage, isFetchingPreviousPage } = context;
  const { fetchNextPage: fetchOlderHistory } = history;
  const handleLoadOlder = useCallback(() => {
    if (inContext) {
      void fetchOlderContext();
      return;
    }
    if (hasOlderHeld) {
      setRevealed({ channelId, pages: renderPages + 1 });
      return;
    }
    void fetchOlderHistory();
  }, [inContext, hasOlderHeld, channelId, renderPages, fetchOlderContext, fetchOlderHistory]);

  const isLoading = history.isLoading || (contextEnabled && context.isLoading);
  const { scrollContainerRef, messagesEndRef, showScrollBtn, scrollToBottom, handleScroll } =
    useChatScroll({ channelId, messageCount: messages.length, isLoading, followLatest: !inContext });

  const handleTimelineScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      handleScroll(event);
      if (!inContext) return;
      const el = event.currentTarget;
      if (el.scrollHeight - el.scrollTop - el.clientHeight > CONTEXT_END_THRESHOLD) return;
      if (hasPreviousPage) {
        if (!isFetchingPreviousPage) void fetchPreviousPage();
        return;
      }
      leave();
    },
    [handleScroll, inContext, hasPreviousPage, isFetchingPreviousPage, fetchPreviousPage, leave],
  );
  const handleLatest = useCallback(() => {
    if (inContext) leave();
    else scrollToBottom("smooth");
  }, [inContext, leave, scrollToBottom]);

  const { isPending: sendPending, mutateAsync: sendAsync } = send;
  const sendMessage = useMemo(
    () => ({
      isPending: sendPending,
      mutateAsync: (input: SendMessageInput) => {
        if (inContext) leave();
        return sendAsync(input);
      },
    }),
    [sendPending, sendAsync, inContext, leave],
  );

  const firstUnreadMessageId = firstUnreadIndex >= 0 ? messages[firstUnreadIndex]?.id : undefined;
  const contextHasOlder = context.hasNextPage;
  const contextFetchingOlder = context.isFetchingNextPage;
  const list = useMemo(
    () => ({
      groupedMessages,
      messages,
      isLoading,
      hasNextPage: inContext ? contextHasOlder : history.hasNextPage || hasOlderHeld,
      isFetchingNextPage: inContext ? contextFetchingOlder : history.isFetchingNextPage,
      fetchNextPage: handleLoadOlder,
      firstUnreadMessageId,
      showScrollBtn: inContext || showScrollBtn,
      latestLabel: inContext ? "Jump to latest" : "New messages",
      scrollToBottom: handleLatest,
      messagesEndRef,
      scrollContainerRef,
      onScroll: handleTimelineScroll,
    }),
    [
      groupedMessages, messages, isLoading, inContext, contextHasOlder, history.hasNextPage,
      hasOlderHeld, contextFetchingOlder, history.isFetchingNextPage, handleLoadOlder,
      firstUnreadMessageId, showScrollBtn, handleLatest, messagesEndRef, scrollContainerRef,
      handleTimelineScroll,
    ],
  );

  return {
    mainMessages,
    messages,
    list,
    scrollToBottom,
    sendMessage,
    threadMessageId: anchor.threadMessageId,
    highlightedReplyId: anchor.highlightedReplyId,
    openThread: anchor.openThread,
    closeThread: anchor.closeThread,
  };
}
