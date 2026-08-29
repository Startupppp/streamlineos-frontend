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

  const [messageInput, setMessageInput] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editInput, setEditInput] = useState("");
  const [lastPollTime, setLastPollTime] = useState(() =>
    new Date().toISOString(),
  );
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const [pendingAttachments, setPendingAttachments] = useState<
    {
      fileName: string;
      fileUrl: string;
      fileKey: string;
      fileSize: number;
      mimeType: string;
    }[]
  >([]);
  const [uploading, setUploading] = useState(false);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);
  const [isOnline, setIsOnline] = useState(true);
  const messageQueue = useRef<
    {
      content: string;
      replyToId?: number;
      metadata?: MessageMetadata;
      attachments?: {
        fileName: string;
        fileUrl: string;
        fileKey: string;
        fileSize: number;
        mimeType: string;
      }[];
    }[]
  >([]);

  const { data: orgUsers } = useChatOrgUsers();
  const chatUserMap = useMemo(() => buildChatUserMap(orgUsers), [orgUsers]);
  const resolveUserName = useCallback(
    (
      userId: string,
      embedded?: { name?: string | null; email?: string | null } | null,
    ) => resolveChatUserName(userId, embedded, chatUserMap),
    [chatUserMap],
  );
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);

  const [showTicketPicker, setShowTicketPicker] = useState(false);
  const [ticketQuery, setTicketQuery] = useState("");
  const [ticketSelectedIndex, setTicketSelectedIndex] = useState(0);
  const pendingEntitiesRef = useRef<TicketEntityRef[]>([]);
  const pendingMentionsRef = useRef<Map<string, string>>(new Map());

  const { candidates: mentionCandidates, filtered: filteredMentions } = useChatMentions({
    orgUsers,
    channel,
    currentUserId,
    query: mentionQuery,
  });

  useEffect(() => {
    if (messageInput) {
      localStorage.setItem(draftKey, messageInput);
    } else {
      localStorage.removeItem(draftKey);
    }
  }, [draftKey, messageInput]);

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

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      setUploading(true);
      const MAX_SIZE = 10 * 1024 * 1024;
      try {
        for (const file of Array.from(files)) {
          if (file.size > MAX_SIZE) {
            toast.error(`${file.name} is too large (max 10MB)`);
            continue;
          }
          const formData = new FormData();
          formData.append("file", file);
          formData.append("folder", "chat");
          try {
            const result = await apiClient.upload<{
              url: string;
              key: string;
              size?: number;
              mimeType?: string;
            }>("/storage/upload", formData);
            setPendingAttachments((prev) => [
              ...prev,
              {
                fileName: file.name,
                fileUrl: result.url,
                fileKey: result.key,
                fileSize: result.size ?? file.size,
                mimeType: result.mimeType ?? file.type,
              },
            ]);
          } catch (err) {
            toast.error(`Failed: ${getErrorMessage(err) || file.name}`);
            continue;
          }
        }
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [],
  );

  const handlePastedFiles = useCallback(async (files: File[]) => {
    setUploading(true);
    const MAX_SIZE = 10 * 1024 * 1024;
    try {
      for (const file of files) {
        if (file.size > MAX_SIZE) {
          toast.error(`${file.name} is too large (max 10MB)`);
          continue;
        }
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "chat");
        try {
          const result = await apiClient.upload<{
            url: string;
            key: string;
            size?: number;
            mimeType?: string;
          }>("/storage/upload", formData);
          setPendingAttachments((prev) => [
            ...prev,
            {
              fileName: file.name,
              fileUrl: result.url,
              fileKey: result.key,
              fileSize: result.size ?? file.size,
              mimeType: result.mimeType ?? file.type,
            },
          ]);
        } catch (err) {
          toast.error(`Failed: ${getErrorMessage(err) || file.name}`);
        }
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUploading(false);
    }
  }, []);

  const insertEmoji = useCallback(
    (emoji: string) => {
      const el = inputRef.current;
      if (el) {
        const start = el.selectionStart ?? messageInput.length;
        const end = el.selectionEnd ?? messageInput.length;
        const newValue =
          messageInput.slice(0, start) + emoji + messageInput.slice(end);
        setMessageInput(newValue);
        setTimeout(() => {
          el.focus();
          el.setSelectionRange(start + emoji.length, start + emoji.length);
        }, 0);
      } else {
        setMessageInput((prev) => prev + emoji);
      }
      setShowEmojiPicker(false);
    },
    [messageInput],
  );

  const insertMention = useCallback(
    (name: string, userId: string) => {
      if (name) pendingMentionsRef.current.set(name, userId);
      const el = inputRef.current;
      if (!el) return;
      const text = messageInput;
      const cursorPos = el.selectionStart ?? text.length;
      const beforeCursor = text.slice(0, cursorPos);
      const atIdx = beforeCursor.lastIndexOf("@");
      if (atIdx === -1) return;
      const newValue =
        text.slice(0, atIdx) + `@${name} ` + text.slice(cursorPos);
      setMessageInput(newValue);
      setShowMentions(false);
      setMentionQuery("");
      setTimeout(() => {
        el.focus();
        const pos = atIdx + name.length + 2;
        el.setSelectionRange(pos, pos);
      }, 0);
    },
    [messageInput],
  );

  const insertTicket = useCallback(
    (ticket: TicketSearchResult) => {
      const el = inputRef.current;
      if (!el) return;
      const token = `${ticket.projectKey}-${ticket.ticketNumber}`;
      const text = messageInput;
      const cursorPos = el.selectionStart ?? text.length;
      const beforeCursor = text.slice(0, cursorPos);
      const hashIdx = beforeCursor.lastIndexOf("#");
      if (hashIdx === -1) return;
      const newValue = text.slice(0, hashIdx) + token + " " + text.slice(cursorPos);
      setMessageInput(newValue);
      setShowTicketPicker(false);
      setTicketQuery("");
      setTicketSelectedIndex(0);
      pendingEntitiesRef.current = [
        ...pendingEntitiesRef.current,
        {
          type: "ticket" as const,
          id: String(ticket.id),
          projectId: ticket.projectId,
          ticketNumber: ticket.ticketNumber,
          projectKey: ticket.projectKey,
          title: ticket.title,
          status: ticket.status,
          priority: ticket.priority,
        },
      ];
      setTimeout(() => {
        el.focus();
        const pos = hashIdx + token.length + 1;
        el.setSelectionRange(pos, pos);
      }, 0);
    },
    [messageInput],
  );

  const handleSend = useCallback(async () => {
    const content = messageInput.trim();
    if (!content && pendingAttachments.length === 0) return;
    const replyId = replyTo?.id;
    const attachments = [...pendingAttachments];
    const entities = [...pendingEntitiesRef.current];
    const metadata = entities.length > 0 ? { entities } : undefined;
    const mentionedUserIds = [
      ...new Set(
        [...pendingMentionsRef.current.entries()]
          .filter(([name]) => content.includes(`@${name}`))
          .map(([, userId]) => userId),
      ),
    ];
    setMessageInput("");
    localStorage.removeItem(draftKey);
    setReplyTo(null);
    setPendingAttachments([]);
    pendingEntitiesRef.current = [];
    pendingMentionsRef.current = new Map();
    if (!isOnline) {
      messageQueue.current.push({
        content: content || "",
        replyToId: replyId,
        attachments: attachments.length > 0 ? attachments : undefined,
        metadata,
      });
      toast.info("You're offline — message will be sent when you reconnect");
      return;
    }
    try {
      await sendMessage.mutateAsync({
        channelId,
        content: content || undefined,
        replyToId: replyId,
        attachments: attachments.length > 0 ? attachments : undefined,
        metadata,
        mentionedUserIds: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
      });
      markRead.mutate({ channelId });
      scrollToBottom("smooth");
    } catch (error) {
      setMessageInput(content);
      setPendingAttachments(attachments);
      toast.error(getErrorMessage(error));
    }
  }, [
    messageInput,
    channelId,
    replyTo,
    sendMessage,
    pendingAttachments,
    isOnline,
    markRead,
    scrollToBottom,
  ]);

  const handleEdit = useCallback(
    async (messageId: number) => {
      const content = editInput.trim();
      if (!content) return;
      try {
        await editMessage.mutateAsync({ channelId, messageId, content });
        setEditingMessage(null);
        setEditInput("");
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [editInput, editMessage, channelId],
  );

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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showTicketPicker) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setTicketSelectedIndex((prev) => Math.min(prev + 1, 9));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setTicketSelectedIndex((prev) => Math.max(prev - 1, 0));
          return;
        }
        if (e.key === "Escape") {
          setShowTicketPicker(false);
          return;
        }
      }
      if (showMentions && filteredMentions.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setMentionIndex((prev) => (prev + 1) % filteredMentions.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setMentionIndex(
            (prev) =>
              (prev - 1 + filteredMentions.length) % filteredMentions.length,
          );
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          insertMention(
            filteredMentions[mentionIndex].name ?? "",
            filteredMentions[mentionIndex].id,
          );
          return;
        }
        if (e.key === "Escape") {
          setShowMentions(false);
          return;
        }
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend, showMentions, filteredMentions, mentionIndex, insertMention, showTicketPicker],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setMessageInput(value);
      const el = e.target;
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
      if (value.trim() && Date.now() - lastTypingSent.current > 3000) {
        lastTypingSent.current = Date.now();
        publishTyping();
      }
      const cursorPos = el.selectionStart ?? value.length;
      const textBefore = value.slice(0, cursorPos);
      const hashMatch = textBefore.match(/#([^\s]*)$/);
      if (hashMatch) {
        setShowTicketPicker(true);
        setTicketQuery(hashMatch[1]);
        setTicketSelectedIndex(0);
        setShowMentions(false);
        setMentionQuery("");
      } else {
        setShowTicketPicker(false);
        setTicketQuery("");
        const atMatch = textBefore.match(/@(\w*)$/);
        if (atMatch) {
          setShowMentions(true);
          setMentionQuery(atMatch[1]);
          setMentionIndex(0);
        } else {
          setShowMentions(false);
          setMentionQuery("");
        }
      }
    },
    [publishTyping],
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

  return (
    <div className="flex flex-1 min-w-0 overflow-hidden">
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border/40 bg-card/80 px-3 backdrop-blur-sm sm:hidden">
          <button
            type="button"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onBack}
            aria-label="Back to conversations"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="min-w-0 flex-1">
            <TruncatedText text={displayName} className="text-sm font-semibold" />
          </div>
          {!isInHuddle && (
            <AnimatedIconButton
              icon={MicIcon}
              iconSize={16}
              variant="ghost"
              size="icon"
              className={cn(
                "size-8 shrink-0",
                activeHuddle && "text-status-success-ink hover:text-status-success-ink",
              )}
              onClick={handleHuddle}
              disabled={startHuddle.isPending || joinHuddle.isPending}
              aria-label={activeHuddle ? "Join huddle" : "Start huddle"}
            />
          )}
          {canUseAi && (
            <AiActionsMenu
              actions={[summarizeAction]}
              align="end"
              disabled={!channelId}
              triggerLabel="AI"
              className="h-8 px-2 text-micro"
            />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <AnimatedIconButton
                icon={EllipsisIcon}
                iconSize={16}
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                aria-label="Conversation actions"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={handleToggleFiles}>
                Shared files
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleToggleSaved}>
                Saved messages
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onToggleInfo}>
                Member details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="hidden h-[56px] shrink-0 items-center gap-3 border-b border-border/40 bg-card/80 px-4 backdrop-blur-sm sm:flex sticky top-0 z-20">
          {onToggleSidebar && (
            <ChannelSidebarCollapseButton
              isCollapsed={isSidebarCollapsed ?? false}
              onToggle={onToggleSidebar}
            />
          )}
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg p-1.5 hover:bg-muted/50 md:hidden"
            aria-label="Back to channels"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative shrink-0">
              <ChannelAvatar
                type={channel?.type}
                name={channel?.name}
                avatarUrl={channel?.avatarUrl}
                otherMember={otherMember}
                className="h-9 w-9"
                rounded="xl"
                iconClassName="h-4 w-4"
              />
              {channel?.type === "DIRECT" && isOtherOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-status-success-fill border-2 border-background" />
              )}
            </div>

            <div className="min-w-0">
              <TruncatedText text={displayName} className="text-sm font-bold leading-tight" />
              <p className="text-dense text-muted-foreground leading-tight">
                {channel?.type === "DIRECT" ? (
                  isOtherOnline ? (
                    <span className="text-status-success-ink font-medium">Online</span>
                  ) : (
                    "Offline"
                  )
                ) : (
                  `${memberCount} members`
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {channel?.type === "GROUP" && (
              <div className="hidden sm:flex -space-x-1.5 mr-2">
                {channel.members?.slice(0, 3).map((m) => (
                  <Avatar
                    key={m.user?.id}
                    className="h-6 w-6 border-2 border-background"
                  >
                    <AvatarImage src={resolveImageUrl(m.user?.image)} />
                    <AvatarFallback className="text-micro">
                      {getInitials(m.user?.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {memberCount > 3 && (
                  <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-micro font-semibold text-muted-foreground">
                    +{memberCount - 3}
                  </div>
                )}
              </div>
            )}
            {!isInHuddle && (
              <AnimatedIconButton
                icon={MicIcon}
                iconSize={14}
                iconClassName="mr-0"
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 gap-1.5 rounded-lg px-2 text-xs font-medium",
                  activeHuddle
                    ? "text-status-success-ink hover:text-status-success-ink hover:bg-status-success-surface"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={handleHuddle}
                disabled={startHuddle.isPending || joinHuddle.isPending}
                aria-label={activeHuddle ? "Join huddle" : "Start huddle"}
              >
                {activeHuddle ? (
                  <span>Join ({activeHuddle.participants.length})</span>
                ) : (
                  <span>Huddle</span>
                )}
              </AnimatedIconButton>
            )}
            {canUseAi && (
              <AiActionsMenu
                actions={[summarizeAction]}
                align="end"
                disabled={!channelId}
              />
            )}
            <PaperclipButton
              onClick={handleToggleFiles}
              className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted/60 transition-colors",
                showFilesPanel
                  ? "bg-muted text-status-info-ink"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title="Shared files"
              aria-label="Shared files"
            />
            <BookmarkButton
              active={showSavedPanel}
              onClick={handleToggleSaved}
              className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted/60 transition-colors",
                showSavedPanel
                  ? "bg-muted text-status-warning-ink"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title="Saved messages"
              aria-label="Saved messages"
            />
            <AnimatedIconButton
              icon={UsersIcon}
              iconSize={16}
              variant="ghost"
              size="icon"
              className={cn("w-8 rounded-lg", showInfoPanel && "bg-muted")}
              onClick={onToggleInfo}
              aria-label="Toggle member info"
              aria-pressed={showInfoPanel}
              aria-expanded={showInfoPanel}
            />
          </div>
        </div>

        {!isOnline && (
          <div className="shrink-0 px-4 py-1.5 bg-status-warning-surface border-b border-status-warning-rule flex items-center gap-2 text-xs text-status-warning-ink font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-status-warning-fill animate-pulse shrink-0" />
            You&apos;re offline — messages will be sent when you reconnect
          </div>
        )}
        <MessagePanelWorkspace
          messageList={{
            groupedMessages, messages, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage,
            currentUserId, channelId, displayName, channelType: channel?.type, editingMessage, editInput,
            pinnedMessageIds, savedMessageIds, replyCountMap, firstUnreadMessageId,
            onEditInputChange: setEditInput,
            onStartEdit: (msg) => { setEditingMessage(msg); setEditInput(msg.content ?? ""); },
            onCancelEdit: () => { setEditingMessage(null); setEditInput(""); }, onSaveEdit: handleEdit,
            onReply: (msg) => { setReplyTo(msg); inputRef.current?.focus(); }, onOpenThread: handleOpenThread,
            onDelete: (messageId) => deleteMessage.mutate({ channelId, messageId }), onReact: handleReact,
            onPin: handlePin, onUnpin: handleUnpin, onSave: handleSave, onUnsaveMsg: handleUnsaveMsg,
            onForward: handleForward, resolveUserName, showScrollBtn, scrollToBottom: () => scrollToBottom("smooth"),
            messagesEndRef, scrollContainerRef, onScroll: handleScroll,
          }}
          messageInput={{
            channelId, displayName, channelType: channel?.type, messageInput, setMessageInput, inputRef,
            fileInputRef, replyTo, setReplyTo, pendingAttachments, setPendingAttachments, uploading,
            onFileSelect: handleFileSelect, showEmojiPicker, setShowEmojiPicker, emojiRef, insertEmoji,
            showMentions, setShowMentions, mentionQuery, mentionIndex, setMentionIndex, filteredMentions,
            insertMention, showTicketPicker, ticketQuery, ticketSelectedIndex, onTicketSelect: insertTicket,
            typingText, sendMessage, onSend: handleSend, onKeyDown: handleKeyDown, onInputChange: handleInputChange,
            onFilesSelected: handlePastedFiles,
          }}
          huddle={activeHuddle && isInHuddle ? { huddle: activeHuddle, channelId, currentUserId } : undefined}
        />
      </div>

      <AnimatePresence>
        {threadMessageId !== null && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="hidden lg:flex flex-col overflow-hidden shrink-0"
          >
            <ThreadPanel
              channelId={channelId}
              parentMessageId={threadMessageId}
              currentUserId={currentUserId}
              onClose={handleCloseThread}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <MessagePanelSidePanels
        channelId={channelId}
        isChatMobile={isChatMobile}
        showSavedPanel={showSavedPanel}
        setShowSavedPanel={setShowSavedPanel}
        showFilesPanel={showFilesPanel}
        setShowFilesPanel={setShowFilesPanel}
        forwardMessage={forwardMessage}
        setForwardMessage={setForwardMessage}
      />
    </div>
  );
}
