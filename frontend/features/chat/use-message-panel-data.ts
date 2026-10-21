"use client";

import { useEffect, useRef, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useChatChannel, useChatChannels, useChatMessages, useChatOnlineUsers, useChatOrgUsers,
} from "@/hooks/api/chat-core-read";
import {
  useSendMessage, useDeleteMessage, useEditMessage, useMarkChannelRead,
} from "@/hooks/api/chat-core-mutations-a";
import { useToggleReaction } from "@/hooks/api/chat-reaction-mutation";
import { useChatPins, usePinMessage, useUnpinMessage } from "@/hooks/api/chat-search";
import { useSavedMessages, useSaveMessage, useUnsaveMessage } from "@/hooks/api/chat-personal-a";
import { useChatPollReconciliation } from "./use-chat-poll-reconciliation";
import { useOrgStorageScope } from "@/lib/org-scoped-storage";
import { useChatRealtime } from "@/hooks/api/chat-realtime";
import { useStartHuddle, useJoinHuddle, useActiveHuddle } from "@/hooks/api/chat-huddles";
import { useHuddleRealtime } from "./huddle-realtime";
import { useAblyConnection } from "./use-ably-connection";
import { buildChatUserMap, readChannelJoinRequired, resolveChatUserName } from "./chat-helpers";
import type { Message } from "@/types/chat";
import type { AiAction } from "@/components/ai";
import { useChatSummarize } from "@/hooks/api/chat-summarize";
import { useCan } from "@/hooks/api/access";
import { useIsChatPanelNarrow } from "./use-chat-mobile";
import { useChatTypingText } from "./use-chat-typing-text";
import { useMessageComposer } from "./use-message-composer";
import { chatDraftKey } from "./composer-draft";
import { resolveDirectPartner } from "./channel-member-lookup";
import { useChatReadMarker } from "./use-chat-read-marker";
import { useChatOfflineQueue } from "./use-chat-offline-queue";
import { useHuddleAutoStart } from "./use-huddle-auto-start";
import { useMessageTimeline } from "./use-message-timeline";
import { useMessagePanelOverlays } from "./use-message-panel-overlays";

export interface MessagePanelProps {
  channelId: number;
  currentUserId: string;
  onBack: () => void;
  onToggleInfo: () => void;
  showInfoPanel: boolean;
  autoStartCall?: "huddle" | null;
  onAutoStartHandled?: () => void;
  scrollToMessageId?: number | null;
  onLeaveMessage?: () => void;
}

export function useMessagePanelData({
  channelId, currentUserId, onBack, onToggleInfo, showInfoPanel,
  autoStartCall, onAutoStartHandled, scrollToMessageId, onLeaveMessage,
}: MessagePanelProps) {
  const scope = useOrgStorageScope();
  const draftKey = chatDraftKey(channelId, scope);
  const draftKeyRef = useRef(draftKey);
  draftKeyRef.current = draftKey;
  const history = useChatMessages(channelId);
  const { channels: myChannels } = useChatChannels();
  const canReadChannel = history.isSuccess || myChannels.some((row) => row.id === channelId);
  const { data: channel } = useChatChannel(channelId, canReadChannel);
  const {
    isLoading,
    // A 500 or a 403 on the history read used to reach the list as `isLoading
    // false, messages []`, which the timeline rendered as an ordinary empty
    // channel. The verdict has to travel with the data.
    isError: messagesError,
    error: messagesErrorValue,
    refetch: refetchMessages,
  } = history;
  const joinRequired = useMemo(() => readChannelJoinRequired(messagesErrorValue), [messagesErrorValue]);
  const markReadRef = useRef(useMarkChannelRead());
  const markRead = markReadRef.current;
  const sendMutation = useSendMessage();
  const deleteMessage = useDeleteMessage();
  const editMessage = useEditMessage();
  const toggleReaction = useToggleReaction(channelId);
  const pinMessage = usePinMessage();
  const unpinMessage = useUnpinMessage();
  const { data: pins } = useChatPins(channelId, canReadChannel);
  const { data: savedData } = useSavedMessages();
  const saveMessage = useSaveMessage();
  const unsaveMessage = useUnsaveMessage();
  const { data: onlineUsers } = useChatOnlineUsers();
  const { isConnected: ablyConnected, typingUserIds, publishTyping } = useChatRealtime(channelId, !canReadChannel);
  const { isConnected: ablySocketConnected } = useAblyConnection();

  useHuddleRealtime(canReadChannel ? channelId : null);
  const { data: activeHuddle } = useActiveHuddle(channelId, canReadChannel);
  const startHuddle = useStartHuddle();
  const joinHuddle = useJoinHuddle();
  const summarize = useChatSummarize();
  const canUseAi = useCan("ai:chat:use");
  const isPanelNarrow = useIsChatPanelNarrow();

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

  const typingUsers = useMemo(
    () =>
      typingUserIds.map((userId) => ({
        userId,
        name: channel?.members.find((member) => member.userId === userId)?.user?.name ?? "Someone",
      })),
    [typingUserIds, channel?.members],
  );
  const typingText = useChatTypingText(typingUsers);
  const { mainMessages, messages, list: timelineList, scrollToBottom, sendMessage, threadMessageId, highlightedReplyId, openThread: handleOpenThread, closeThread: handleCloseThread } = useMessageTimeline({ channelId, currentUserId, members: channel?.members, anchorMessageId: scrollToMessageId ?? null, onLeaveAnchor: onLeaveMessage, canReadChannel, history, send: sendMutation });

  useHuddleAutoStart({
    channelId,
    autoStartCall,
    onAutoStartHandled,
    activeHuddle,
    isInHuddle,
    startHuddle,
    joinHuddle,
  });

  const { showSavedPanel, setShowSavedPanel, forwardMessage, setForwardMessage, handleToggleSaved } =
    useMessagePanelOverlays({ threadMessageId, closeThread: handleCloseThread });
  const flushQueueRef = useRef<() => Promise<void>>(async () => undefined);
  const { isOnline } = useChatOfflineQueue(flushQueueRef);

  const { data: orgUsers } = useChatOrgUsers();
  const chatUserMap = useMemo(() => buildChatUserMap(orgUsers), [orgUsers]);
  const resolveUserName = useCallback(
    (userId: string | null, embedded?: { name?: string | null; email?: string | null } | null) =>
      resolveChatUserName(userId, embedded, chatUserMap),
    [chatUserMap],
  );
  const scrollToBottomRef = useRef<(behavior?: ScrollBehavior) => void>(() => undefined);
  const { messageInput, setMessageInput, replyTo, setReplyTo, editingMessage, setEditingMessage, editInput, setEditInput, pendingAttachments, setPendingAttachments, uploading, showEmojiPicker, setShowEmojiPicker, showMentions, setShowMentions, mentionIndex, filteredMentions, mentionPrompt, dismissMentionPrompt, recordPicker, selectRecord, linkedRecords, removeLinkedRecord, inputRef, fileInputRef, emojiRef, handleFileSelect, handlePastedFiles, insertEmoji, insertMention, handleSend, handleEdit, handleInputChange, handleKeyDown, flushMessageQueue } = useMessageComposer({ channelId, draftKey, isOnline, sendMessage, editMessage, markRead, scrollToBottom: (behavior) => scrollToBottomRef.current(behavior), publishTyping, channel, currentUserId });
  useEffect(() => {
    flushQueueRef.current = flushMessageQueue;
  }, [flushMessageQueue]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [channelId, inputRef]);

  useEffect(() => {
    const key = draftKeyRef.current;
    if (messageInput) {
      localStorage.setItem(key, messageInput);
    } else {
      localStorage.removeItem(key);
    }
  }, [messageInput]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        emojiRef.current &&
        e.target instanceof Node &&
        !emojiRef.current.contains(e.target)
      )
        setShowEmojiPicker(false);
    };
    if (showEmojiPicker) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmojiPicker]);

  useChatPollReconciliation({
    channelId,
    newestLoadedAt: mainMessages.at(-1)?.createdAt ?? null,
    isRealtimeConnected: ablyConnected,
    isHistoryLoading: isLoading,
    canReadChannel,
    refetchHistory: refetchMessages,
  });

  useChatReadMarker({
    channelId,
    newestMessageId: mainMessages.at(-1)?.id,
    markRead,
  });

  scrollToBottomRef.current = scrollToBottom;

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
  }, [setForwardMessage]);

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
    channel?.type === "DIRECT" ? (otherMember?.name ?? "Unknown") : (channel?.name ?? joinRequired?.channelName ?? "Chat");
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

  const handleHuddle = useCallback(() => {
    if (activeHuddle) { joinHuddle.mutate({ huddleId: activeHuddle.id, channelId }); return; }
    startHuddle.mutate(channelId);
  }, [activeHuddle, channelId, joinHuddle, startHuddle]);

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

  const handleReply = useCallback((msg: Message) => {
    setReplyTo(msg);
    inputRef.current?.focus();
  }, [setReplyTo, inputRef]);

  const handleRetryMessages = useCallback(() => {
    void refetchMessages();
  }, [refetchMessages]);

  return {
    header: { onBack, displayName, channel, otherMember, isOtherOnline, memberCount, activeHuddle, isInHuddle, onHuddle: handleHuddle, huddleStartPending: startHuddle.isPending, huddleJoinPending: joinHuddle.isPending, canUseAi, summarizeAction, onToggleSaved: handleToggleSaved, onToggleInfo, showInfoPanel },
    workspace: {
      messageList: { ...timelineList, isError: messagesError, errorMessage: messagesError ? getErrorMessage(messagesErrorValue) : undefined, onRetry: handleRetryMessages, joinRequired, currentUserId, channelId, displayName, channelType: channel?.type, editingMessage, editInput, pinnedMessageIds, savedMessageIds, replyCountMap, onEditInputChange: setEditInput, onStartEdit: handleStartEdit, onCancelEdit: handleCancelEdit, onSaveEdit: handleEdit, onReply: handleReply, onOpenThread: handleOpenThread, onDelete: handleDelete, onReact: handleReact, onPin: handlePin, onUnpin: handleUnpin, onSave: handleSave, onUnsaveMsg: handleUnsaveMsg, onForward: handleForward, resolveUserName, scrollToMessageId },
      messageInput: { channelId, displayName, channelType: channel?.type, messageInput, setMessageInput, inputRef, fileInputRef, replyTo, setReplyTo, pendingAttachments, setPendingAttachments, uploading, onFileSelect: handleFileSelect, showEmojiPicker, setShowEmojiPicker, emojiRef, insertEmoji, showMentions, setShowMentions, mentionIndex, filteredMentions, insertMention, mentionPrompt, onDismissMentionPrompt: dismissMentionPrompt, recordPicker, onSelectRecord: selectRecord, linkedRecords, onRemoveLinkedRecord: removeLinkedRecord, typingText, onSend: handleSend, onKeyDown: handleKeyDown, onInputChange: handleInputChange, onFilesSelected: handlePastedFiles },
      huddle: activeHuddle && isInHuddle ? { huddle: activeHuddle, channelId, currentUserId } : undefined,
    },
    thread: { messageId: threadMessageId, highlightedReplyId, channelId, currentUserId, onClose: handleCloseThread },
    sidePanels: { isPanelNarrow, showSavedPanel, setShowSavedPanel, forwardMessage, setForwardMessage },
    isOnline,
    isReconnecting: isOnline && !ablySocketConnected,
  };
}
