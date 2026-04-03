"use client";

import Image from "next/image";
import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  Fragment,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ArrowDown,
  ArrowLeft,
  FileText,
  Hash,
  Loader2,
  Paperclip,
  Reply,
  Send,
  Smile,
  AtSign,
  Users,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import {
  useChatChannel,
  useChatMessages,
  useChatPoll,
  useMarkRead,
  useSendMessage,
  useDeleteMessage,
  useEditMessage,
  useChatOnlineUsers,
  useSetTyping,
  useChatTyping,
  useChatOrgUsers,
} from "@/lib/hooks/trpc-hooks";
import { queryKeys } from "@/lib/query-keys";
import {
  getInitials,
  getDateLabel,
  formatFileSize,
  getFileColor,
  getFileExt,
  isImageMime,
  resolveFileUrl,
} from "./chat-helpers";
import type { Message } from "./chat-types";
import { ChatBubble } from "./chat-bubble";
import { EmojiGrid } from "./emoji-grid";

export function MessagePanel({
  channelId,
  currentUserId,
  onBack,
  onToggleInfo,
  showInfoPanel,
}: {
  channelId: number;
  currentUserId: string;
  onBack: () => void;
  onToggleInfo: () => void;
  showInfoPanel: boolean;
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
  const markReadRef = useRef(useMarkRead());
  const markRead = markReadRef.current;
  const sendMessage = useSendMessage();
  const deleteMessage = useDeleteMessage();
  const editMessage = useEditMessage();
  const { data: onlineUsers } = useChatOnlineUsers();
  const setTyping = useSetTyping();
  const { data: typingUsers } = useChatTyping(channelId, channelId > 0);
  const lastTypingSent = useRef(0);

  const onlineUserIds = useMemo(
    () => new Set(onlineUsers?.map((u: { userId: string }) => u.userId) ?? []),
    [onlineUsers]
  );

  const typingText = useMemo(() => {
    if (!typingUsers || typingUsers.length === 0) return null;
    const names = typingUsers.map((t: { name: string }) => t.name.split(" ")[0]);
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
  const [lastPollTime, setLastPollTime] = useState(() => new Date().toISOString());
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pendingAttachments, setPendingAttachments] = useState<
    { fileName: string; fileUrl: string; fileKey: string; fileSize: number; mimeType: string }[]
  >([]);
  const [uploading, setUploading] = useState(false);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  const { data: orgUsers } = useChatOrgUsers();
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);

  const filteredMentions = useMemo(() => {
    if (!orgUsers || !mentionQuery) return orgUsers ?? [];
    const q = mentionQuery.toLowerCase();
    return orgUsers.filter((u) => u.name?.toLowerCase().includes(q));
  }, [orgUsers, mentionQuery]);

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
    const all = (messagesData?.pages.flatMap((p) => p.messages) as Message[]) ?? [];
    const seen = new Set<number>();
    return all.filter((msg) => {
      if (seen.has(msg.id)) return false;
      seen.add(msg.id);
      return true;
    });
  }, [messagesData]);

  const { data: polledMessages } = useChatPoll(channelId, lastPollTime, messages.length > 0);

  useEffect(() => {
    if (polledMessages && polledMessages.length > 0) {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.messages(channelId) });
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

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const MAX_SIZE = 10 * 1024 * 1024;
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_SIZE) { toast.error(`${file.name} is too large (max 10MB)`); continue; }
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "chat");
        const res = await fetch("/api/storage/upload", { method: "POST", body: formData });
        if (!res.ok) { const err = await res.json(); toast.error(`Failed: ${err.error || file.name}`); continue; }
        const result = await res.json();
        setPendingAttachments((prev) => [
          ...prev,
          { fileName: file.name, fileUrl: result.url, fileKey: result.key, fileSize: result.size ?? file.size, mimeType: result.mimeType ?? file.type },
        ]);
      }
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  }, []);

  const insertEmoji = useCallback((emoji: string) => {
    const el = inputRef.current;
    if (el) {
      const start = el.selectionStart ?? messageInput.length;
      const end = el.selectionEnd ?? messageInput.length;
      const newValue = messageInput.slice(0, start) + emoji + messageInput.slice(end);
      setMessageInput(newValue);
      setTimeout(() => { el.focus(); el.setSelectionRange(start + emoji.length, start + emoji.length); }, 0);
    } else {
      setMessageInput((prev) => prev + emoji);
    }
    setShowEmojiPicker(false);
  }, [messageInput]);

  const insertMention = useCallback((name: string) => {
    const el = inputRef.current;
    if (!el) return;
    const text = messageInput;
    const cursorPos = el.selectionStart ?? text.length;
    const beforeCursor = text.slice(0, cursorPos);
    const atIdx = beforeCursor.lastIndexOf("@");
    if (atIdx === -1) return;
    const newValue = text.slice(0, atIdx) + `@${name} ` + text.slice(cursorPos);
    setMessageInput(newValue);
    setShowMentions(false);
    setMentionQuery("");
    setTimeout(() => { el.focus(); const pos = atIdx + name.length + 2; el.setSelectionRange(pos, pos); }, 0);
  }, [messageInput]);

  const handleSend = useCallback(async () => {
    const content = messageInput.trim();
    if (!content && pendingAttachments.length === 0) return;
    const replyId = replyTo?.id;
    const attachments = [...pendingAttachments];
    setMessageInput("");
    setReplyTo(null);
    setPendingAttachments([]);
    try {
      await sendMessage.mutateAsync({ channelId, content: content || undefined, replyToId: replyId, attachments: attachments.length > 0 ? attachments : undefined });
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch {
      setMessageInput(content);
      setPendingAttachments(attachments);
      toast.error("Failed to send message");
    }
  }, [messageInput, channelId, replyTo, sendMessage, pendingAttachments]);

  const handleEdit = useCallback(async (messageId: number) => {
    const content = editInput.trim();
    if (!content) return;
    try {
      await editMessage.mutateAsync({ channelId, messageId, content });
      setEditingMessage(null);
      setEditInput("");
    } catch { toast.error("Failed to edit message"); }
  }, [editInput, editMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && filteredMentions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((prev) => (prev + 1) % filteredMentions.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((prev) => (prev - 1 + filteredMentions.length) % filteredMentions.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(filteredMentions[mentionIndex].name ?? ""); return; }
      if (e.key === "Escape") { setShowMentions(false); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend, showMentions, filteredMentions, mentionIndex, insertMention]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessageInput(value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
    if (value.trim() && Date.now() - lastTypingSent.current > 3000) {
      lastTypingSent.current = Date.now();
      setTyping.mutate({ channelId });
    }
    const cursorPos = el.selectionStart ?? value.length;
    const textBefore = value.slice(0, cursorPos);
    const atMatch = textBefore.match(/@(\w*)$/);
    if (atMatch) { setShowMentions(true); setMentionQuery(atMatch[1]); setMentionIndex(0); }
    else { setShowMentions(false); setMentionQuery(""); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const otherMember = channel?.type === "DIRECT" ? channel.members?.find((m) => m.user?.id !== currentUserId)?.user : null;
  const displayName = channel?.type === "DIRECT" ? otherMember?.name ?? "Unknown" : channel?.name ?? "Chat";
  const memberCount = channel?.members?.length ?? 0;
  const isOtherOnline = channel?.type === "DIRECT" && otherMember ? onlineUserIds.has(otherMember.id) : false;

  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = "";
    for (const msg of messages) {
      const d = msg.createdAt ? new Date(msg.createdAt) : new Date();
      const dateStr = getDateLabel(d);
      if (dateStr !== currentDate) { currentDate = dateStr; groups.push({ date: dateStr, messages: [] }); }
      groups[groups.length - 1].messages.push(msg);
    }
    return groups;
  }, [messages]);

  return (
    <>
      {/* Header */}
      <div className="h-[56px] px-4 border-b border-border/40 flex items-center gap-3 shrink-0 bg-card/80 backdrop-blur-sm sticky top-0 z-20">
        <button onClick={onBack} className="md:hidden p-1.5 -ml-1 hover:bg-muted/50 rounded-lg">
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          {channel?.type === "DIRECT" ? (
            <div className="relative">
              <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                <AvatarFallback className="text-[10px] font-semibold bg-gradient-to-br from-[#bd882c]/20 to-[#bd882c]/5 text-[#bd882c]">
                  {getInitials(otherMember?.name)}
                </AvatarFallback>
              </Avatar>
              {isOtherOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
              )}
            </div>
          ) : (
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#0f2b7f]/10 to-[#0f2b7f]/5 flex items-center justify-center border border-[#0f2b7f]/10">
              <Hash className="h-4 w-4 text-[#0f2b7f]" />
            </div>
          )}

          <div className="min-w-0">
            <h3 className="text-[15px] font-bold truncate leading-tight">{displayName}</h3>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {channel?.type === "DIRECT" ? (
                isOtherOnline ? <span className="text-emerald-500 font-medium">Online</span> : "Offline"
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
                <Avatar key={m.user?.id} className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={resolveImageUrl(m.user?.image)} />
                  <AvatarFallback className="text-[8px]">{getInitials(m.user?.name)}</AvatarFallback>
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
          >
            <Users className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto relative"
        style={{ backgroundImage: "radial-gradient(circle at 50% 50%, hsl(var(--muted) / 0.3) 0%, transparent 70%)" }}
        ref={scrollContainerRef}
        onScroll={handleScroll}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-[#bd882c]" />
            <p className="text-[13px] text-muted-foreground mt-3">Loading messages...</p>
          </div>
        ) : (
          <div className="py-2 px-3 sm:px-5 max-w-[900px] mx-auto">
            {hasNextPage && (
              <div className="flex justify-center pb-4">
                <Button variant="outline" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="h-7 text-[12px] rounded-full px-4">
                  {isFetchingNextPage ? <><Loader2 className="h-3 w-3 animate-spin mr-1.5" />Loading...</> : "Load older messages"}
                </Button>
              </div>
            )}

            {groupedMessages.map((group) => (
              <Fragment key={group.date}>
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-border/40" />
                  <span className="text-[10px] font-semibold text-muted-foreground/60 bg-background px-2.5 py-0.5 rounded-full border border-border/30">
                    {group.date}
                  </span>
                  <div className="flex-1 h-px bg-border/40" />
                </div>

                {group.messages.map((msg, idx) => {
                  const isOwn = msg.senderId === currentUserId;
                  const prevMsg = idx > 0 ? group.messages[idx - 1] : null;
                  const isSameSender = prevMsg?.senderId === msg.senderId && !prevMsg?.isDeleted;
                  const timeDiff = prevMsg?.createdAt && msg.createdAt
                    ? new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()
                    : 0;
                  const showHeader = !isSameSender || timeDiff > 2 * 60 * 1000;

                  return (
                    <ChatBubble
                      key={msg.id}
                      message={msg}
                      isOwn={isOwn}
                      showSender={showHeader}
                      isEditing={editingMessage?.id === msg.id}
                      editInput={editingMessage?.id === msg.id ? editInput : ""}
                      onEditInputChange={setEditInput}
                      onStartEdit={() => { setEditingMessage(msg); setEditInput(msg.content ?? ""); }}
                      onCancelEdit={() => { setEditingMessage(null); setEditInput(""); }}
                      onSaveEdit={() => handleEdit(msg.id)}
                      onReply={() => { setReplyTo(msg); inputRef.current?.focus(); }}
                      onDelete={() => deleteMessage.mutate({ channelId, messageId: msg.id })}
                    />
                  );
                })}
              </Fragment>
            ))}

            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#bd882c]/15 to-[#bd882c]/5 flex items-center justify-center mb-3">
                  <Send className="h-5 w-5 text-[#bd882c]" />
                </div>
                <h4 className="text-[14px] font-semibold mb-0.5">
                  {channel?.type === "DIRECT" ? `Start a conversation with ${displayName}` : `Welcome to #${displayName}`}
                </h4>
                <p className="text-[12px] text-muted-foreground max-w-xs text-center">Send a message to get things started.</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={scrollToBottom}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 h-8 rounded-full bg-background border border-border/60 shadow-lg flex items-center gap-1.5 px-3 hover:bg-muted transition-colors"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              <span className="text-[11px] font-medium">New messages</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Reply Preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/30 overflow-hidden bg-muted/20"
          >
            <div className="flex items-center gap-3 px-4 py-2 max-w-[900px] mx-auto">
              <div className="w-1 h-9 rounded-full bg-[#bd882c] shrink-0" />
              <Reply className="h-4 w-4 text-[#bd882c] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-[#bd882c]">Replying to {replyTo.sender?.name}</p>
                <p className="text-[12px] text-muted-foreground truncate">{replyTo.content}</p>
              </div>
              <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-muted rounded-md">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Composer */}
      <div className="px-3 sm:px-5 py-2 border-t border-border/40 shrink-0 bg-card/50 relative">
        <div className="max-w-[900px] mx-auto">
          <AnimatePresence>
            {showMentions && filteredMentions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute bottom-full left-3 sm:left-6 right-3 sm:right-6 mb-1 z-20"
              >
                <div className="max-w-[800px] mx-auto">
                  <div className="bg-background border border-border/60 rounded-xl shadow-lg overflow-hidden max-h-[200px] overflow-y-auto">
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/30">Members</div>
                    {filteredMentions.slice(0, 8).map((user, idx) => (
                      <button
                        key={user.id}
                        onClick={() => insertMention(user.name ?? "")}
                        className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/40 transition-colors", idx === mentionIndex && "bg-[#bd882c]/10")}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={resolveImageUrl(user.image)} />
                          <AvatarFallback className="text-[8px]">{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-[13px] font-medium">{user.name}</span>
                        <span className="text-[11px] text-muted-foreground ml-auto">{user.role}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                ref={emojiRef}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute bottom-full left-3 sm:left-6 mb-1 z-20"
              >
                <EmojiGrid onSelect={insertEmoji} />
              </motion.div>
            )}
          </AnimatePresence>

          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {pendingAttachments.map((att, idx) => {
                const colors = getFileColor(att.fileName);
                return (
                  <div key={idx} className="relative group flex items-center gap-2.5 bg-background border border-border rounded-xl px-3 py-2 shadow-sm">
                    {att.mimeType.startsWith("image/") ? (
                      <Image src={att.fileUrl} alt={att.fileName} width={44} height={44} unoptimized className="h-11 w-11 rounded-lg object-cover border border-border/30" />
                    ) : (
                      <div className={cn("h-11 w-11 rounded-lg flex flex-col items-center justify-center relative", colors.bg)}>
                        <FileText className={cn("h-5 w-5", colors.text)} />
                        <span className={cn("text-[7px] font-bold text-white px-1 rounded mt-0.5", colors.badge)}>{getFileExt(att.fileName)}</span>
                      </div>
                    )}
                    <div className="min-w-0 max-w-[140px]">
                      <p className="text-[12px] font-medium truncate">{att.fileName}</p>
                      <p className="text-[10px] text-muted-foreground">{formatFileSize(att.fileSize)}</p>
                    </div>
                    <button
                      onClick={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
              {uploading && (
                <div className="flex items-center gap-2 bg-muted/40 border border-border/40 rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[#bd882c]" />
                  <span className="text-[11px] text-muted-foreground">Uploading...</span>
                </div>
              )}
            </div>
          )}

          {typingText && (
            <div className="px-4 pb-1">
              <span className="text-xs text-muted-foreground/70 italic animate-pulse">{typingText}</span>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-background shadow-md focus-within:border-[#bd882c]/50 focus-within:shadow-lg transition-all">
            <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.doc,.docx,.xls,.xlsx" onChange={handleFileSelect} className="hidden" />
            <textarea
              ref={inputRef}
              value={messageInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${channel?.type === "DIRECT" ? displayName : "#" + displayName}...`}
              rows={1}
              className="w-full bg-transparent text-[14px] resize-none px-4 pt-3 pb-1 focus:outline-none placeholder:text-muted-foreground/60 min-h-[40px] max-h-[160px]"
            />
            <div className="flex items-center justify-between px-3 py-1.5">
              <div className="flex items-center gap-0.5">
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className={cn("p-2 rounded-lg hover:bg-muted/60 transition-colors", uploading ? "text-[#bd882c] animate-pulse" : "text-muted-foreground/70 hover:text-foreground")} title="Attach file (max 10MB)">
                  <Paperclip className="h-[18px] w-[18px]" />
                </button>
                <button
                  onClick={() => { setShowEmojiPicker((p) => !p); setShowMentions(false); }}
                  className={cn("p-2 rounded-lg hover:bg-muted/60 transition-colors", showEmojiPicker ? "text-[#bd882c] bg-muted/50" : "text-muted-foreground/70 hover:text-foreground")}
                  title="Emoji"
                >
                  <Smile className="h-[18px] w-[18px]" />
                </button>
                <button
                  onClick={() => {
                    const el = inputRef.current;
                    if (el) {
                      const pos = el.selectionStart ?? messageInput.length;
                      const newVal = messageInput.slice(0, pos) + "@" + messageInput.slice(pos);
                      setMessageInput(newVal);
                      setShowMentions(true);
                      setMentionQuery("");
                      setShowEmojiPicker(false);
                      setTimeout(() => { el.focus(); el.setSelectionRange(pos + 1, pos + 1); }, 0);
                    }
                  }}
                  className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground/70 hover:text-foreground transition-colors"
                  title="Mention someone"
                >
                  <AtSign className="h-[18px] w-[18px]" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground/50 hidden sm:inline">Shift+Enter for new line</span>
                <button
                  onClick={handleSend}
                  disabled={(!messageInput.trim() && pendingAttachments.length === 0) || sendMessage.isPending}
                  className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center transition-all",
                    (messageInput.trim() || pendingAttachments.length > 0)
                      ? "bg-gradient-to-r from-[#bd882c] to-[#d4a544] text-white shadow-md hover:shadow-lg hover:scale-105"
                      : "bg-muted/50 text-muted-foreground/30 cursor-not-allowed"
                  )}
                >
                  {sendMessage.isPending ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Send className="h-[18px] w-[18px]" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
