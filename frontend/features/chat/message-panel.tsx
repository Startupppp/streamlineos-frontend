"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Hash, PanelLeftOpen, Users } from "lucide-react";
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
} from "@/hooks/api";
import { queryKeys } from "@/lib/query-keys";
import { apiClient, getApiError } from "@/lib/api-client";
import { useChatRealtime } from "@/hooks/api/chat-realtime";
import { getInitials, getDateLabel } from "./chat-helpers";
import type { Message } from "./chat-types";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";

export function MessagePanel({
  channelId,
  curren
  onBack,
  onToggleInfo,
  showInfoPanel,
  sidebarCollapsed,
  onExpandSidebar,
}: {
  channelId: number;
  currentUserId: string;
  onBack: () => void;
  onToggleInfo: () => void;
  showInfoPanel: boolean;
  sidebarCollapsed?: boolean;
  onExpandSidebar?: () => void;
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
  const { data: onlineUsers } = useChatOnlineUsers();
  const lastTypingSent = useRef(0);
  const {
    isConnected: ablyConnected,
    typingUsers,
    publishTyping,
  } = useChatRealtime(channelId);

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [messageInput, setMessageInput] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editInput, setEditInput] = useState("");
  const [lastPollTime, setLastPollTime] = useState(() =>
    new Date().toISOString(),
  );
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const { data: orgUsers } = useChatOrgUsers();
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);

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
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmojiPicker]);

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
    if (channelId > 0) markRead.mutate({ channelId });
  }, [channelId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    setLastPollTime(new Date().toISOString());
    setReplyTo(null);
    setMessageInput("");
    setEditingMessage(null);
    setPendingAttachments([]);
    setShowEmojiPicker(false);
    setShowMentions(false);
    inputRef.current?.focus();
  }, [channelId]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 100);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

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

  const handleSend = useCallback(async () => {
    const content = messageInput.trim();
    if (!content && pendingAttachments.length === 0) return;
    const replyId = replyTo?.id;
    const attachments = [...pendingAttachments];
    setMessageInput("");
    setReplyTo(null);
    setPendingAttachments([]);
    try {
      await sendMessage.mutateAsync({
        channelId,
        content: content || undefined,
        replyToId: replyId,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      setMessageInput(content);
      setPendingAttachments(attachments);
      toast.error(getErrorMessage(error));
    }
  }, [messageInput, channelId, replyTo, sendMessage, pendingAttachments]);

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

  const handleReact = useCallback(
    (messageId: number, emoji: string) => {
      toggleReaction.mutate({ messageId, emoji });
    },
    [toggleReaction],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
    [handleSend, showMentions, filteredMentions, mentionIndex, insertMention],
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
      const atMatch = textBefore.match(/@(\w*)$/);
      if (atMatch) {
        setShowMentions(true);
        setMentionQuery(atMatch[1]);
        setMentionIndex(0);
      } else {
        setShowMentions(false);
        setMentionQuery("");
      }
    },
    [],
  ); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <>
      <div className="h-[56px] px-4 border-b border-border/40 flex items-center gap-3 shrink-0 bg-card/80 backdrop-blur-sm sticky top-0 z-20">
        {sidebarCollapsed && onExpandSidebar && (
          <button
            onClick={onExpandSidebar}
            className="hidden md:flex p-1.5 -ml-1 hover:bg-muted/50 rounded-lg"
            aria-label="Open conversations"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onBack}
          className="md:hidden p-1.5 -ml-1 hover:bg-muted/50 rounded-lg"
          aria-label="Back to channels"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          {channel?.type === "DIRECT" ? (
            <div className="relative">
              <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                <AvatarFallback className="text-[10px] font-semibold bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-600">
                  {getInitials(otherMember?.name)}
                </AvatarFallback>
              </Avatar>
              {isOtherOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
              )}
            </div>
          ) : (
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue/10 to-blue/5 flex items-center justify-center border border-blue/10">
              <Hash className="h-4 w-4 text-blue" />
            </div>
          )}

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
        onDelete={(messageId) => deleteMessage.mutate({ channelId, messageId })}
        onReact={handleReact}
        showScrollBtn={showScrollBtn}
        scrollToBottom={scrollToBottom}
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
        typingText={typingText}
        sendMessage={sendMessage}
        onSend={handleSend}
        onKeyDown={handleKeyDown}
        onInputChange={handleInputChange}
      />
    </>
  );
}
