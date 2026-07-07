"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Bookmark,
  Mic,
  Paperclip,
  Users,
  Video,
} from "lucide-react";
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
import { apiClient, getApiError } from "@/lib/api-client";
import { useChatRealtime } from "@/hooks/api/chat-realtime";
import {
  useStartHuddle,
  useJoinHuddle,
  useActiveHuddle,
  useStartVideoMeeting,
} from "@/hooks/api/chat-huddles";
import { useHuddleRealtime } from "./huddle-realtime";
import { HuddlePanel } from "./huddle-panel";
import { VideoMeetingPanel } from "./video-meeting-panel";
import { getInitials, getDateLabel } from "./chat-helpers";
import type { Message, TicketEntityRef, MessageMetadata } from "./chat-types";
import type { TicketSearchResult } from "@/hooks/api/projects";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { useChatScroll } from "./use-chat-scroll";
import { ChannelAvatar } from "./channel-avatar";
import { ThreadPanel } from "./thread-panel";
import { SavedMessagesPanel } from "./saved-messages-panel";
import { SharedFilesPanel } from "./shared-files-panel";
import { ForwardMessageDialog } from "./forward-message-dialog";
import { ChannelSidebarCollapseButton } from "./channel-sidebar-collapse-button";

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
  autoStartCall?: "huddle" | "video" | null;
  onAutoStartHandled?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}) {
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
  const startVideoMeeting = useStartVideoMeeting();

  const isInHuddle =
    activeHuddle?.participants.some((p) => p.userId === currentUserId) ?? false;

  const onlineUserIds = useMemo(
    () => new Set(onlineUsers?.map((u: { userId: string }) => u.userId) ?? []),
    [onlineUsers],
  );

  const typingText = useMemo(() => {
    if (!typingUsers || typingUsers.length === 0) return null;
    const names = typingUsers.map(
      (t: { name: string }) => t.name.split(" ")[0],
    );
    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return `${names[0]} and ${names.length - 1} others are typing...`;
  }, [typingUsers]);

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
  const [showMeeting, setShowMeeting] = useState(false);
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

    if (autoStartCall === "video") {
      if (!activeHuddle) startVideoMeeting.mutate(channelId);
      setShowMeeting(true);
    } else if (activeHuddle) {
      joinHuddle.mutate({ huddleId: activeHuddle.id, channelId });
    } else {
      startHuddle.mutate(channelId);
    }

    onAutoStartHandled?.();
  }, [autoStartCall, channelId, activeHuddle, startHuddle, startVideoMeeting, joinHuddle, onAutoStartHandled]);
  const [showSavedPanel, setShowSavedPanel] = useState(false);
  const [showFilesPanel, setShowFilesPanel] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<{
    content: string | null;
    metadata?: Message["metadata"];
    attachments?: Message["attachments"];
  } | null>(null);

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
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);

  const [showTicketPicker, setShowTicketPicker] = useState(false);
  const [ticketQuery, setTicketQuery] = useState("");
  const [ticketSelectedIndex, setTicketSelectedIndex] = useState(0);
  const pendingEntitiesRef = useRef<TicketEntityRef[]>([]);

  const mentionCandidates = useMemo(() => {
    if (!orgUsers) return [];
    if (channel?.type === "DIRECT") {
      const otherId = channel.members?.find((m) => m.user?.id !== currentUserId)
        ?.user?.id;
      return orgUsers.filter((u) => u.id === otherId);
    }
    return orgUsers.filter((u) => u.id !== currentUserId);
  }, [orgUsers, channel, currentUserId]);

  const filteredMentions = useMemo(() => {
    if (!mentionQuery) return mentionCandidates;
    const q = mentionQuery.toLowerCase();
    return mentionCandidates.filter((u) => u.name?.toLowerCase().includes(q));
  }, [mentionCandidates, mentionQuery]);

  useEffect(() => {
    if (messageInput) {
      localStorage.setItem(`chat:draft:${channelId}`, messageInput);
    } else {
      localStorage.removeItem(`chat:draft:${channelId}`);
    }
  }, [channelId, messageInput]);

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
      (messagesData?.pages.flatMap((p) => p.messages) as Message[]) ?? [];
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
    setMessageInput(localStorage.getItem(`chat:draft:${channelId}`) ?? "");
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
        if (showMeeting) {
          setShowMeeting(false);
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
    showMeeting,
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
            toast.error(`Failed: ${getApiError(err) || file.name}`);
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
          toast.error(`Failed: ${getApiError(err) || file.name}`);
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
    (name: string) => {
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
    setMessageInput("");
    localStorage.removeItem(`chat:draft:${channelId}`);
    setReplyTo(null);
    setPendingAttachments([]);
    pendingEntitiesRef.current = [];
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
          insertMention(filteredMentions[mentionIndex].name ?? "");
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
        <div className="h-[56px] px-4 border-b border-border/40 flex items-center gap-3 shrink-0 bg-card/80 backdrop-blur-sm sticky top-0 z-20">
          {onToggleSidebar && (
            <ChannelSidebarCollapseButton
              isCollapsed={isSidebarCollapsed ?? false}
              onToggle={onToggleSidebar}
            />
          )}
          <button
            onClick={onBack}
            className="md:hidden p-1.5 -ml-1 hover:bg-muted/50 rounded-lg"
            aria-label="Back to channels"
          >
            <ArrowLeft className="h-4 w-4" />
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
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
              )}
            </div>

            <div className="min-w-0">
              <h3 className="text-[15px] font-bold truncate leading-tight">
                {displayName}
              </h3>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {channel?.type === "DIRECT" ? (
                  isOtherOnline ? (
                    <span className="text-emerald-500 font-medium">Online</span>
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
                    <AvatarFallback className="text-[8px]">
                      {getInitials(m.user?.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {memberCount > 3 && (
                  <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-semibold text-muted-foreground">
                    +{memberCount - 3}
                  </div>
                )}
              </div>
            )}
            {!isInHuddle && (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 gap-1.5 rounded-lg px-2 text-xs font-medium",
                  activeHuddle
                    ? "text-green-500 hover:text-green-500 hover:bg-green-500/10"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => {
                  if (activeHuddle) {
                    joinHuddle.mutate({ huddleId: activeHuddle.id, channelId });
                  } else {
                    startHuddle.mutate(channelId);
                  }
                }}
                disabled={startHuddle.isPending || joinHuddle.isPending}
                aria-label={activeHuddle ? "Join huddle" : "Start huddle"}
              >
                <Mic className="h-3.5 w-3.5" />
                {activeHuddle ? (
                  <span>Join ({activeHuddle.participants.length})</span>
                ) : (
                  <span>Huddle</span>
                )}
              </Button>
            )}
            <button
              onClick={() => {
                if (!activeHuddle) {
                  startVideoMeeting.mutate(channelId);
                }
                setShowMeeting(true);
              }}
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
              title="Video meeting"
              aria-label="Video meeting"
            >
              <Video
                className={cn(
                  "h-4 w-4",
                  activeHuddle?.hasVideo ? "text-blue-500" : "",
                )}
              />
            </button>
            <button
              onClick={() => {
                setShowFilesPanel((p) => !p);
                setShowSavedPanel(false);
              }}
              className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted/60 transition-colors",
                showFilesPanel
                  ? "bg-muted text-blue-500"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title="Shared files"
              aria-label="Shared files"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setShowSavedPanel((p) => !p);
                setShowFilesPanel(false);
              }}
              className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted/60 transition-colors",
                showSavedPanel
                  ? "bg-muted text-amber-500"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title="Saved messages"
              aria-label="Saved messages"
            >
              <Bookmark
                className={cn("h-4 w-4", showSavedPanel && "fill-amber-500")}
              />
            </button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8 rounded-lg", showInfoPanel && "bg-muted")}
              onClick={onToggleInfo}
              aria-label="Toggle member info"
            >
              <Users className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!isOnline && (
          <div className="shrink-0 px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2 text-[12px] text-amber-600 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            You&apos;re offline — messages will be sent when you reconnect
          </div>
        )}
        <MessageList
          groupedMessages={groupedMessages}
          messages={messages}
          isLoading={isLoading}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
          currentUserId={currentUserId}
          channelId={channelId}
          displayName={displayName}
          channelType={channel?.type}
          editingMessage={editingMessage}
          editInput={editInput}
          pinnedMessageIds={pinnedMessageIds}
          savedMessageIds={savedMessageIds}
          replyCountMap={replyCountMap}
          firstUnreadMessageId={firstUnreadMessageId}
          onEditInputChange={setEditInput}
          onStartEdit={(msg) => {
            setEditingMessage(msg);
            setEditInput(msg.content ?? "");
          }}
          onCancelEdit={() => {
            setEditingMessage(null);
            setEditInput("");
          }}
          onSaveEdit={handleEdit}
          onReply={(msg) => {
            setReplyTo(msg);
            inputRef.current?.focus();
          }}
          onOpenThread={handleOpenThread}
          onDelete={(messageId) =>
            deleteMessage.mutate({ channelId, messageId })
          }
          onReact={handleReact}
          onPin={handlePin}
          onUnpin={handleUnpin}
          onSave={handleSave}
          onUnsaveMsg={handleUnsaveMsg}
          onForward={handleForward}
          showScrollBtn={showScrollBtn}
          scrollToBottom={() => scrollToBottom("smooth")}
          messagesEndRef={messagesEndRef}
          scrollContainerRef={scrollContainerRef}
          onScroll={handleScroll}
        />

        <MessageInput
          channelId={channelId}
          displayName={displayName}
          channelType={channel?.type}
          messageInput={messageInput}
          setMessageInput={setMessageInput}
          inputRef={inputRef}
          fileInputRef={fileInputRef}
          replyTo={replyTo}
          setReplyTo={setReplyTo}
          pendingAttachments={pendingAttachments}
          setPendingAttachments={setPendingAttachments}
          uploading={uploading}
          onFileSelect={handleFileSelect}
          showEmojiPicker={showEmojiPicker}
          setShowEmojiPicker={setShowEmojiPicker}
          emojiRef={emojiRef}
          insertEmoji={insertEmoji}
          showMentions={showMentions}
          setShowMentions={setShowMentions}
          mentionQuery={mentionQuery}
          mentionIndex={mentionIndex}
          setMentionIndex={setMentionIndex}
          filteredMentions={filteredMentions}
          insertMention={insertMention}
          showTicketPicker={showTicketPicker}
          ticketQuery={ticketQuery}
          ticketSelectedIndex={ticketSelectedIndex}
          onTicketSelect={insertTicket}
          typingText={typingText}
          sendMessage={sendMessage}
          onSend={handleSend}
          onKeyDown={handleKeyDown}
          onInputChange={handleInputChange}
          onFilesSelected={handlePastedFiles}
        />

        {activeHuddle && isInHuddle && (
          <HuddlePanel
            huddle={activeHuddle}
            channelId={channelId}
            currentUserId={currentUserId}
          />
        )}
      </div>

      {showMeeting && (
        <VideoMeetingPanel
          channelId={channelId}
          currentUserId={currentUserId}
          onClose={() => setShowMeeting(false)}
        />
      )}

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

      <AnimatePresence>
        {showSavedPanel && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="hidden lg:flex flex-col overflow-hidden shrink-0"
          >
            <SavedMessagesPanel
              onClose={() => setShowSavedPanel(false)}
              onJumpToChannel={() => setShowSavedPanel(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFilesPanel && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="hidden lg:flex flex-col overflow-hidden shrink-0"
          >
            <SharedFilesPanel
              channelId={channelId}
              onClose={() => setShowFilesPanel(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <ForwardMessageDialog
        message={forwardMessage}
        open={Boolean(forwardMessage)}
        onOpenChange={(o) => {
          if (!o) setForwardMessage(null);
        }}
      />
    </div>
  );
}
