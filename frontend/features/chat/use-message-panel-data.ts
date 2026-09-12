"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useChatChannel, useChatMessages, useMarkChannelRead,
  useSendMessage, useDeleteMessage, useEditMessage, useChatOnlineUsers,
  useChatOrgUsers, useToggleReaction, useChatPins, usePinMessage,
  useUnpinMessage, useSavedMessages, useSaveMessage, useUnsaveMessage,
} from "@/hooks/api/chat";
import { useChatPollReconciliation } from "./use-chat-poll-reconciliation";
import { orgScopedStorageKey, useOrgStorageScope } from "@/lib/org-scoped-storage";
import { useChatRealtime } from "@/hooks/api/chat-realtime";
import { useStartHuddle, useJoinHuddle, useActiveHuddle } from "@/hooks/api/chat-huddles";
import { useHuddleRealtime } from "./huddle-realtime";
import { useAblyConnection } from "./use-ably-connection";
import { getDateLabel, buildChatUserMap, resolveChatUserName } from "./chat-helpers";
import type { Message } from "./chat-types";
import { useChatScroll } from "./use-chat-scroll";
import { resolveMessageWindowStart } from "./message-render-window";
import type { AiAction } from "@/components/ai";
import { useChatSummarize } from "@/hooks/api/chat-summarize";
import { useCan } from "@/hooks/api/access";
import { useIsChatMobile } from "./use-chat-mobile";
import type { ForwardableMessage } from "./forward-message-dialog";
import { useChatMentions } from "./use-chat-mentions";
import { useChatTypingText } from "./use-chat-typing-text";
import { useMessageComposer } from "./use-message-composer";
import { findOwnMember, resolveDirectPartner } from "./channel-member-lookup";

export interface MessagePanelProps {
  channelId: number;
  currentUserId: string;
  onBack: () => void;
  onToggleInfo: () => void;
  showInfoPanel: boolean;
  autoStartCall?: "huddle" | null;
  onAutoStartHandled?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function useMessagePanelData({
  channelId, currentUserId, onBack, onToggleInfo, showInfoPanel,
  autoStartCall, onAutoStartHandled, isSidebarCollapsed, onToggleSidebar,
}: MessagePanelProps) {
  const scope = useOrgStorageScope();
  const draftKey = orgScopedStorageKey(`chat:draft:${channelId}`, scope);
  const { data: channel } = useChatChannel(channelId);
  const {
    data: messagesData,
    isLoading,
    // A 500 or a 403 on the history read used to reach the list as `isLoading
    // false, messages []`, which the timeline rendered as an ordinary empty
    // channel. The verdict has to travel with the data.
    isError: messagesError,
    error: messagesErrorValue,
    refetch: refetchMessages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useChatMessages(channelId);
  const markReadRef = useRef(useMarkChannelRead());
  const markRead = markReadRef.current;
  const sendMessage = useSendMessage();
  const deleteMessage = useDeleteMessage();
  const editMessage = useEditMessage();
  const toggleReaction = useToggleReaction(channelId);
  const pinMessage = usePinMessage();
  const unpinMessage = useUnpinMessage();
  const { data: pins } = useChatPins(channelId);
  const { data: savedData } = useSavedMessages();
  const saveMessage = useSaveMessage();
  const unsaveMessage = useUnsaveMessage();
  const { data: onlineUsers } = useChatOnlineUsers();
  const lastTypingSent = useRef(0);
  const { isConnected: ablyConnected, typingUsers, publishTyping } = useChatRealtime(channelId);
  const { isConnected: ablySocketConnected } = useAblyConnection();
  useHuddleRealtime(channelId);
  const { data: activeHuddle } = useActiveHuddle(channelId);
  const startHuddle = useStartHuddle();
  const joinHuddle = useJoinHuddle();
  const summarize = useChatSummarize();
  const canUseAi = useCan("ai:chat:use");
  const isChatMobile = useIsChatMobile();

  const summarizeAction: AiAction = useMemo(
    () => ({
      key: "summarize",
      label: "Summarize conversation",
      description: "Get a plain-language recap of key points, decisions, and action items",
      run: () => summarize(channelId),
    }),
    [summarize, channelId],
  );

  const isInHuddle = activeHuddle?.participants.some((p) => p.userId === currentUserId) ?? false;

  const onlineUserIds = useMemo(
    () => new Set(onlineUsers?.map((u: { userId: string }) => u.userId) ?? []),
    [onlineUsers],
  );

  const typingText = useChatTypingText(typingUsers);

  const [threadMessageId, setThreadMessageId] = useState<number | null>(null);
  const autoStartHandledRef = useRef(false);
  const markReadCalledRef = useRef<number | null>(null);
  const joinHuddleCalledRef = useRef<number | null>(null);

  useEffect(() => {
    if (!autoStartCall) {
      autoStartHandledRef.current = false;
      return;
    }
    if (autoStartHandledRef.current) return;
    autoStartHandledRef.current = true;
    if (activeHuddle) {
      joinHuddle.mutate({ huddleId: activeHuddle.id, channelId });
    } else {
      startHuddle.mutate(channelId);
    }
    onAutoStartHandled?.();
  }, [autoStartCall, channelId, activeHuddle, startHuddle, joinHuddle, onAutoStartHandled]);

  const [showSavedPanel, setShowSavedPanel] = useState(false);
  const [showFilesPanel, setShowFilesPanel] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<ForwardableMessage | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  const { data: orgUsers } = useChatOrgUsers();
  const chatUserMap = useMemo(() => buildChatUserMap(orgUsers), [orgUsers]);
  const resolveUserName = useCallback(
    (userId: string | null, embedded?: { name?: string | null; email?: string | null } | null) =>
      resolveChatUserName(userId, embedded, chatUserMap),
    [chatUserMap],
  );
  const scrollToBottomRef = useRef<(behavior?: ScrollBehavior) => void>(() => undefined);
  const { messageInput, setMessageInput, replyTo, setReplyTo, editingMessage, setEditingMessage, editInput, setEditInput, pendingAttachments, setPendingAttachments, uploading, showEmojiPicker, setShowEmojiPicker, showMentions, setShowMentions, mentionQuery, setMentionQuery, mentionIndex, setMentionIndex, showTicketPicker, setShowTicketPicker, ticketQuery, setTicketQuery, ticketSelectedIndex, setTicketSelectedIndex, inputRef, fileInputRef, emojiRef, messageQueue, pendingEntitiesRef, pendingMentionsRef, setFilteredMentions, handleFileSelect, handlePastedFiles, insertEmoji, insertMention, insertTicket, handleSend, handleEdit, handleInputChange, handleKeyDown } = useMessageComposer({ channelId, draftKey, isOnline, sendMessage, editMessage, markRead, scrollToBottom: (behavior) => scrollToBottomRef.current(behavior), publishTyping, filteredMentions: [] });

  useEffect(() => {
    if (messageInput) {
      localStorage.setItem(draftKey, messageInput);
    } else {
      localStorage.removeItem(draftKey);
    }
  }, [draftKey, messageInput]);

  const { filtered: filteredMentions } = useChatMentions({ orgUsers, channel, currentUserId, query: mentionQuery });
  setFilteredMentions(filteredMentions);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node))
        setShowEmojiPicker(false);
    };
    if (showEmojiPicker) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmojiPicker]);

  useEffect(() => {
    const goOnline = async () => {
      setIsOnline(true);
      const queued = [...messageQueue.current];
      messageQueue.current = [];
      for (const msg of queued) {
        try {
          await sendMessage.mutateAsync({
            channelId,
            // Minted when the message was queued, so two `online` events — or a
            // reconnect that races the send — replay the winner rather than
            // inserting the message twice.
            clientKey: msg.clientKey,
            content: msg.content,
            replyToId: msg.replyToId,
            attachments: msg.attachments,
            metadata: msg.metadata,
          });
        } catch {}
      }
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [channelId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (joinHuddleCalledRef.current === channelId) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("joinHuddle") === "1" && activeHuddle && !isInHuddle) {
      joinHuddleCalledRef.current = channelId;
      joinHuddle.mutate({ huddleId: activeHuddle.id, channelId });
      const url = new URL(window.location.href);
      url.searchParams.delete("joinHuddle");
      window.history.replaceState({}, "", url.toString());
    }
  }, [activeHuddle, channelId]); // eslint-disable-line react-hooks/exhaustive-deps

  const messages: Message[] = useMemo(() => {
    const all =
      ([...(messagesData?.pages ?? [])].reverse().flatMap((p) => p.messages) as Message[]) ?? [];
    const seen = new Set<number>();
    return all.filter((msg) => {
      if (seen.has(msg.id)) return false;
      seen.add(msg.id);
      return true;
    });
  }, [messagesData]);

  const [renderPages, setRenderPages] = useState(1);
  useEffect(() => {
    setRenderPages(1);
  }, [channelId]);

  useChatPollReconciliation({
    channelId,
    newestLoadedAt: messages.at(-1)?.createdAt ?? null,
    isRealtimeConnected: ablyConnected,
    isHistoryLoading: isLoading,
    refetchHistory: refetchMessages,
  });

  useEffect(() => {
    if (channelId > 0 && markReadCalledRef.current !== channelId) {
      markReadCalledRef.current = channelId;
      markRead.mutate({ channelId });
    }
  }, [channelId]); // eslint-disable-line react-hooks/exhaustive-deps

  const { scrollContainerRef, messagesEndRef, showScrollBtn, scrollToBottom, handleScroll } = useChatScroll({
    channelId,
    messageCount: messages.length,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });
  scrollToBottomRef.current = scrollToBottom;

  useEffect(() => {
    setReplyTo(null);
    setMessageInput(localStorage.getItem(draftKey) ?? "");
    setEditingMessage(null);
    setPendingAttachments([]);
    setShowEmojiPicker(false);
    setShowMentions(false);
    setShowTicketPicker(false);
    setTicketQuery("");
    pendingEntitiesRef.current = [];
    setThreadMessageId(null);
    setShowFilesPanel(false);
    inputRef.current?.focus();
  }, [channelId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "k") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("chat:open-search"));
        return;
      }
      if (e.key === "Escape") {
        if (threadMessageId !== null) { setThreadMessageId(null); return; }
        if (showSavedPanel) { setShowSavedPanel(false); return; }
        if (showFilesPanel) setShowFilesPanel(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [threadMessageId, showSavedPanel, showFilesPanel]);

  const pinnedMessageIds = useMemo(() => new Set((pins ?? []).map((p) => p.messageId)), [pins]);

  const savedMessageIds = useMemo(
    () => new Set(savedData?.pages.flatMap((p) => p.items.map((i) => i.messageId)) ?? []),
    [savedData],
  );

  const handleSave = useCallback(
    async (messageId: number) => {
      try {
        await saveMessage.mutateAsync(messageId);
        toast.success("Message saved");
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [saveMessage],
  );

  const handleUnsaveMsg = useCallback(
    async (messageId: number) => {
      try {
        await unsaveMessage.mutateAsync(messageId);
        toast.success("Message removed from saved");
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [unsaveMessage],
  );

  const handleForward = useCallback((msg: Message) => {
    setForwardMessage({ content: msg.content, metadata: msg.metadata, attachments: msg.attachments });
  }, []);

  const handleReact = useCallback(
    (messageId: number, emoji: string) => { toggleReaction.mutate({ messageId, emoji }); },
    [toggleReaction],
  );

  const handlePin = useCallback(
    (messageId: number) => { pinMessage.mutate({ channelId, messageId }); },
    [pinMessage, channelId],
  );

  const handleUnpin = useCallback(
    (messageId: number) => { unpinMessage.mutate({ channelId, messageId }); },
    [unpinMessage, channelId],
  );

  const otherMember =
    channel?.type === "DIRECT" ? resolveDirectPartner(channel.members, currentUserId) : null;
  const displayName =
    channel?.type === "DIRECT" ? (otherMember?.name ?? "Unknown") : (channel?.name ?? "Chat");
  const memberCount = channel?.memberCount ?? channel?.members?.length ?? 0;
  const isOtherOnline = channel?.type === "DIRECT" && otherMember ? onlineUserIds.has(otherMember.id) : false;

  const replyCountMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const msg of messages) {
      if (msg.replyToId !== null && msg.replyToId !== undefined)
        map.set(msg.replyToId, (map.get(msg.replyToId) ?? 0) + 1);
    }
    return map;
  }, [messages]);

  const handleOpenThread = useCallback((msg: Message) => { setThreadMessageId(msg.id); }, []);
  const handleCloseThread = useCallback(() => { setThreadMessageId(null); }, []);
  const handleToggleFiles = useCallback(() => { setShowFilesPanel((p) => !p); setShowSavedPanel(false); }, []);
  const handleToggleSaved = useCallback(() => { setShowSavedPanel((p) => !p); setShowFilesPanel(false); }, []);
  const handleHuddle = useCallback(() => {
    if (activeHuddle) { joinHuddle.mutate({ huddleId: activeHuddle.id, channelId }); return; }
    startHuddle.mutate(channelId);
  }, [activeHuddle, channelId, joinHuddle, startHuddle]);

  const firstUnreadIndex = useMemo(() => {
    const currentMember = findOwnMember(channel?.members, currentUserId);
    const lastReadAt = currentMember?.lastReadAt;
    if (!lastReadAt) return -1;
    const lastReadTime = new Date(lastReadAt).getTime();
    return messages.findIndex(
      (m) => m.createdAt && new Date(m.createdAt).getTime() > lastReadTime,
    );
  }, [messages, channel, currentUserId]);

  const firstUnreadMessageId =
    firstUnreadIndex >= 0 ? messages[firstUnreadIndex]?.id : undefined;

  const windowStart = resolveMessageWindowStart(
    messages.length,
    renderPages,
    firstUnreadIndex,
  );
  const renderedMessages = useMemo(
    () => (windowStart === 0 ? messages : messages.slice(windowStart)),
    [messages, windowStart],
  );
  const hasOlderHeld = windowStart > 0;

  const handleLoadOlder = useCallback(() => {
    if (hasOlderHeld) {
      setRenderPages((p) => p + 1);
      return;
    }
    void fetchNextPage();
  }, [hasOlderHeld, fetchNextPage]);

  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = "";
    for (const msg of renderedMessages) {
      const d = msg.createdAt ? new Date(msg.createdAt) : new Date();
      const dateStr = getDateLabel(d);
      let group = groups[groups.length - 1];
      if (!group || dateStr !== currentDate) {
        currentDate = dateStr;
        group = { date: dateStr, messages: [] };
        groups.push(group);
      }
      group.messages.push(msg);
    }
    return groups;
  }, [renderedMessages]);

  const handleStartEdit = useCallback((msg: Message) => {
    setEditingMessage(msg);
    setEditInput(msg.content ?? "");
  }, [setEditingMessage, setEditInput]);

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
    setEditInput("");
  }, [setEditingMessage, setEditInput]);

  const handleDelete = useCallback(
    (messageId: number) => { deleteMessage.mutate({ channelId, messageId }); },
    [deleteMessage, channelId],
  );

  const handleScrollToBottom = useCallback(() => scrollToBottom("smooth"), [scrollToBottom]);

  const handleReply = useCallback((msg: Message) => {
    setReplyTo(msg);
    inputRef.current?.focus();
  }, [setReplyTo, inputRef]);

  const handleRetryMessages = useCallback(() => {
    void refetchMessages();
  }, [refetchMessages]);

  return {
    header: { onBack, displayName, channel, otherMember, isOtherOnline, memberCount, activeHuddle, isInHuddle, onHuddle: handleHuddle, huddleStartPending: startHuddle.isPending, huddleJoinPending: joinHuddle.isPending, canUseAi, summarizeAction, channelId, onToggleFiles: handleToggleFiles, onToggleSaved: handleToggleSaved, showFilesPanel, showSavedPanel, onToggleInfo, showInfoPanel, isSidebarCollapsed, onToggleSidebar },
    workspace: {
      messageList: { groupedMessages, messages, isLoading, isError: messagesError, errorMessage: messagesError ? getErrorMessage(messagesErrorValue) : undefined, onRetry: handleRetryMessages, hasNextPage: hasNextPage || hasOlderHeld, isFetchingNextPage, fetchNextPage: handleLoadOlder, currentUserId, channelId, displayName, channelType: channel?.type, editingMessage, editInput, pinnedMessageIds, savedMessageIds, replyCountMap, firstUnreadMessageId, onEditInputChange: setEditInput, onStartEdit: handleStartEdit, onCancelEdit: handleCancelEdit, onSaveEdit: handleEdit, onReply: handleReply, onOpenThread: handleOpenThread, onDelete: handleDelete, onReact: handleReact, onPin: handlePin, onUnpin: handleUnpin, onSave: handleSave, onUnsaveMsg: handleUnsaveMsg, onForward: handleForward, resolveUserName, showScrollBtn, scrollToBottom: handleScrollToBottom, messagesEndRef, scrollContainerRef, onScroll: handleScroll },
      messageInput: { channelId, displayName, channelType: channel?.type, messageInput, setMessageInput, inputRef, fileInputRef, replyTo, setReplyTo, pendingAttachments, setPendingAttachments, uploading, onFileSelect: handleFileSelect, showEmojiPicker, setShowEmojiPicker, emojiRef, insertEmoji, showMentions, setShowMentions, mentionQuery, mentionIndex, setMentionIndex, filteredMentions, insertMention, showTicketPicker, ticketQuery, ticketSelectedIndex, onTicketSelect: insertTicket, typingText, sendMessage, onSend: handleSend, onKeyDown: handleKeyDown, onInputChange: handleInputChange, onFilesSelected: handlePastedFiles },
      huddle: activeHuddle && isInHuddle ? { huddle: activeHuddle, channelId, currentUserId } : undefined,
    },
    thread: { messageId: threadMessageId, channelId, currentUserId, onClose: handleCloseThread },
    sidePanels: { channelId, isChatMobile, showSavedPanel, setShowSavedPanel, showFilesPanel, setShowFilesPanel, forwardMessage, setForwardMessage },
    isOnline,
    isReconnecting: isOnline && !ablySocketConnected,
  };
}
