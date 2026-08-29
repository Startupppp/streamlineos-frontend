"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { ArrowLeft } from "lucide-react";
import {
  EllipsisIcon,
  MicIcon,
  UsersIcon,
} from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { AnimatePresence, motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import {
  useChatChannel,
  useChatMessages,
  useChatPoll,
  useMarkChannelRead,
  useSendMessage,
  useDeleteMessage,
  useEditMessage,
  useChatOnlineUsers,
  useChatOrgUsers,
  useToggleReaction,
  useChatPins,
  usePinMessage,
  useUnpinMessage,
  useSavedMessages,
  useSaveMessage,
  useUnsaveMessage,
} from "@/hooks/api/chat";
import { queryKeys } from "@/lib/query-keys";
import { apiClient } from "@/lib/api-client";
import { orgScopedStorageKey, useOrgStorageScope } from "@/lib/org-scoped-storage";
import { useChatRealtime } from "@/hooks/api/chat-realtime";
import {
  useStartHuddle,
  useJoinHuddle,
  useActiveHuddle,
} from "@/hooks/api/chat-huddles";
import { useHuddleRealtime } from "./huddle-realtime";
import { getInitials, getDateLabel, buildChatUserMap, resolveChatUserName } from "./chat-helpers";
import type { Message, TicketEntityRef, MessageMetadata } from "./chat-types";
import type { TicketSearchResult } from "@/hooks/api/build";
import { MessagePanelWorkspace } from "./message-panel-workspace";
import { useChatScroll } from "./use-chat-scroll";
import { ChannelAvatar } from "./channel-avatar";
import { ThreadPanel } from "./thread-panel";
import { ChannelSidebarCollapseButton } from "./channel-sidebar-collapse-button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { AiActionsMenu, type AiAction } from "@/components/ai";
import { useChatSummarize } from "@/hooks/api/chat-summarize";
import { useCan } from "@/hooks/api/access";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsChatMobile } from "./use-chat-mobile";
import { BookmarkButton, PaperclipButton } from "./message-panel-actions";
import { MessagePanelSidePanels } from "./message-panel-side-panels";
import type { ForwardableMessage } from "./forward-message-dialog";
import { useChatMentions } from "./use-chat-mentions";
import { useChatTypingText } from "./use-chat-typing-text";
import { useMessageComposer } from "./use-message-composer";
import { MessagePanelView } from "./message-panel-view";

export function MessagePanel({
  channelId,
  currentUserId,
  onBack,
  onToggleInfo,
  showInfoPanel,
  autoStartCall,
  onAutoStartHandled,
  isSidebarCollapsed,
  onToggleSidebar,
}: {
  channelId: number;
  currentUserId: string;
  onBack: () => void;
  onToggleInfo: () => void;
  showInfoPanel: boolean;
  autoStartCall?: "huddle" | null;
  onAutoStartHandled?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}) {
  const scope = useOrgStorageScope();
  const draftKey = orgScopedStorageKey(`chat:draft:${channelId}`, scope);
  const queryClient = useQueryClient();
  const { data: channel } = useChatChannel(channelId);
  const {
    data: messagesData,
    isLoading,
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
  const {
    isConnected: ablyConnected,
    typingUsers,
    publishTyping,
  } = useChatRealtime(channelId);
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

  const isInHuddle =
    activeHuddle?.participants.some((p) => p.userId === currentUserId) ?? false;

  const onlineUserIds = useMemo(
    () => new Set(onlineUsers?.map((u: { userId: string }) => u.userId) ?? []),
    [onlineUsers],
  );

  const typingText = useChatTypingText(typingUsers);

  const [lastPollTime, setLastPollTime] = useState(() =>
    new Date().toISOString(),
  );
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
    (
      userId: string,
      embedded?: { name?: string | null; email?: string | null } | null,
    ) => resolveChatUserName(userId, embedded, chatUserMap),
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
  const { candidates: mentionCandidates, filtered: filteredMentions } = useChatMentions({
    orgUsers,
    channel,
    currentUserId,
    query: mentionQuery,
  });
  setFilteredMentions(filteredMentions);


  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
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

  const { data: polledMessages } = useChatPoll(
    channelId,
    lastPollTime,
    !ablyConnected && messages.length > 0,
  );

  useEffect(() => {
    if (polledMessages && polledMessages.length > 0) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.messages(channelId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
      setLastPollTime(new Date().toISOString());
    }
  }, [polledMessages, channelId, queryClient]);

  useEffect(() => {
    if (channelId > 0 && markReadCalledRef.current !== channelId) {
      markReadCalledRef.current = channelId;
      markRead.mutate({ channelId });
    }
  }, [channelId]); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    scrollContainerRef,
    messagesEndRef,
    showScrollBtn,
    scrollToBottom,
    handleScroll,
  } = useChatScroll({
    channelId,
    messageCount: messages.length,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });
  scrollToBottomRef.current = scrollToBottom;

  useEffect(() => {
    setLastPollTime(new Date().toISOString());
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
  }, [channelId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "k") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("chat:open-search"));
        return;
      }
      if (e.key === "Escape") {
        if (threadMessageId !== null) {
          setThreadMessageId(null);
          return;
        }
        if (showSavedPanel) {
          setShowSavedPanel(false);
          return;
        }
        if (showFilesPanel) {
          setShowFilesPanel(false);
          return;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    threadMessageId,
    showSavedPanel,
    showFilesPanel,
  ]);

  const pinnedMessageIds = useMemo(
    () => new Set((pins ?? []).map((p) => p.messageId)),
    [pins],
  );

  const savedMessageIds = useMemo(
    () =>
      new Set(
        savedData?.pages.flatMap((p) => p.items.map((i) => i.messageId)) ?? [],
      ),
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
    setForwardMessage({
      content: msg.content,
      metadata: msg.metadata,
      attachments: msg.attachments,
    });
  }, []);

  const handleReact = useCallback(
    (messageId: number, emoji: string) => {
      toggleReaction.mutate({ messageId, emoji });
    },
    [toggleReaction],
  );

  const handlePin = useCallback(
    (messageId: number) => {
      pinMessage.mutate({ channelId, messageId });
    },
    [pinMessage, channelId],
  );

  const handleUnpin = useCallback(
    (messageId: number) => {
      unpinMessage.mutate({ channelId, messageId });
    },
    [unpinMessage, channelId],
  );

  const otherMember =
    channel?.type === "DIRECT"
      ? channel.members?.find((m) => m.user?.id !== currentUserId)?.user
      : null;
  const displayName =
    channel?.type === "DIRECT"
      ? (otherMember?.name ?? "Unknown")
      : (channel?.name ?? "Chat");
  const memberCount = channel?.members?.length ?? 0;
  const isOtherOnline =
    channel?.type === "DIRECT" && otherMember
      ? onlineUserIds.has(otherMember.id)
      : false;

  const replyCountMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const msg of messages) {
      if (msg.replyToId !== null && msg.replyToId !== undefined) {
        map.set(msg.replyToId, (map.get(msg.replyToId) ?? 0) + 1);
      }
    }
    return map;
  }, [messages]);

  const handleOpenThread = useCallback((msg: Message) => {
    setThreadMessageId(msg.id);
  }, []);

  const handleCloseThread = useCallback(() => {
    setThreadMessageId(null);
  }, []);
  const handleToggleFiles = useCallback(() => {
    setShowFilesPanel((previous) => !previous);
    setShowSavedPanel(false);
  }, []);
  const handleToggleSaved = useCallback(() => {
    setShowSavedPanel((previous) => !previous);
    setShowFilesPanel(false);
  }, []);
  const handleHuddle = useCallback(() => {
    if (activeHuddle) {
      joinHuddle.mutate({ huddleId: activeHuddle.id, channelId });
      return;
    }
    startHuddle.mutate(channelId);
  }, [activeHuddle, channelId, joinHuddle, startHuddle]);

  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = "";
    for (const msg of messages) {
      const d = msg.createdAt ? new Date(msg.createdAt) : new Date();
      const dateStr = getDateLabel(d);
      if (dateStr !== currentDate) {
        currentDate = dateStr;
        groups.push({ date: dateStr, messages: [] });
      }
      groups[groups.length - 1].messages.push(msg);
    }
    return groups;
  }, [messages]);

  const firstUnreadMessageId = useMemo(() => {
    const currentMember = channel?.members?.find(
      (m) => m.user?.id === currentUserId,
    );
    const lastReadAt = currentMember?.lastReadAt;
    if (!lastReadAt) return undefined;
    const lastReadTime = new Date(lastReadAt).getTime();
    return messages.find(
      (m) =>
        m.createdAt &&
        new Date(m.createdAt).getTime() > lastReadTime,
    )?.id;
  }, [messages, channel, currentUserId]);

  return <MessagePanelView {...{ onBack, displayName, activeHuddle, isInHuddle, handleHuddle, startHuddle, joinHuddle, canUseAi, summarizeAction, channelId, handleToggleFiles, handleToggleSaved, onToggleInfo, showInfoPanel, isSidebarCollapsed, onToggleSidebar, channel, otherMember, isOtherOnline, memberCount, showFilesPanel, showSavedPanel, isOnline, groupedMessages, messages, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage, currentUserId, editingMessage, editInput, pinnedMessageIds, savedMessageIds, replyCountMap, firstUnreadMessageId, setEditInput, setEditingMessage, setReplyTo, inputRef, deleteMessage, handleEdit, handleOpenThread, handleReact, handlePin, handleUnpin, handleSave, handleUnsaveMsg, handleForward, resolveUserName, showScrollBtn, scrollToBottom, messagesEndRef, scrollContainerRef, handleScroll, messageInput, setMessageInput, pendingAttachments, setPendingAttachments, uploading, fileInputRef, handleFileSelect, showEmojiPicker, setShowEmojiPicker, emojiRef, insertEmoji, showMentions, setShowMentions, mentionQuery, mentionIndex, setMentionIndex, filteredMentions, insertMention, showTicketPicker, ticketQuery, ticketSelectedIndex, insertTicket, typingText, sendMessage, handleSend, handleKeyDown, handleInputChange, handlePastedFiles, threadMessageId, handleCloseThread, isChatMobile, setShowFilesPanel, setShowSavedPanel, forwardMessage, setForwardMessage }} />;
}
