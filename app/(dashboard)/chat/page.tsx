"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  Fragment,
} from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  useChatChannels,
  useChatChannel,
  useChatMessages,
  useChatPoll,
  useSendMessage,
  useMarkRead,
  useCreateDM,
  useCreateGroupChannel,
  useChatOnlineUsers,
  useChatHeartbeat,
  useChatOrgUsers,
  useDeleteMessage,
  useEditMessage,
  useSetTyping,
  useChatTyping,
  useUpdateChannel,
} from "@/lib/hooks/trpc-hooks";
import { vaivammKeys } from "@/lib/hooks/trpc-keys";
import { cn, resolveImageUrl } from "@/lib/utils";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import {
  MessageCircle,
  Search,
  Plus,
  Hash,
  Users,
  Send,
  ArrowLeft,
  Trash2,
  Reply,
  FileText,
  X,
  Check,
  CheckCheck,
  Pencil,
  ChevronDown,
  ChevronRight,
  Smile,
  AtSign,
  Paperclip,
  Copy,
  Loader2,
  ArrowDown,
  Camera,
  ImageIcon,
} from "lucide-react";

/* ─── Types ─── */

type ChannelRaw = NonNullable<ReturnType<typeof useChatChannels>["data"]>[number];
type Channel = Omit<ChannelRaw, "lastMessage"> & {
  lastMessage?: { content?: string | null; senderName?: string | null; createdAt?: Date | string | null } | null;
};
type Message = {
  id: number;
  channelId: number;
  senderId: string;
  content: string | null;
  replyToId: number | null;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
  sender: { id: string; name: string | null; image: string | null } | null;
  attachments: {
    id: number;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }[];
  replyTo: {
    id: number;
    content: string | null;
    sender: { id: string; name: string | null } | null;
  } | null;
};

/* ─── Helpers ─── */

function getInitials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatMessageTime(date: Date | string | null) {
  if (!date) return "";
  return format(new Date(date), "h:mm a");
}

function formatMessageTimeFull(date: Date | string | null) {
  if (!date) return "";
  const d = new Date(date);
  if (isToday(d)) return `Today at ${format(d, "h:mm a")}`;
  if (isYesterday(d)) return `Yesterday at ${format(d, "h:mm a")}`;
  return format(d, "MMM d, yyyy") + " at " + format(d, "h:mm a");
}

function formatChannelTime(date: Date | string | null) {
  if (!date) return "";
  const d = new Date(date);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExt(name: string) {
  return name.split(".").pop()?.toUpperCase() || "FILE";
}

function getFileColor(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf": return { bg: "bg-red-500/10", text: "text-red-600", badge: "bg-red-500" };
    case "doc": case "docx": return { bg: "bg-blue-500/10", text: "text-blue-600", badge: "bg-blue-500" };
    case "xls": case "xlsx": return { bg: "bg-emerald-500/10", text: "text-emerald-600", badge: "bg-emerald-500" };
    case "ppt": case "pptx": return { bg: "bg-orange-500/10", text: "text-orange-600", badge: "bg-orange-500" };
    case "zip": case "rar": return { bg: "bg-amber-500/10", text: "text-amber-600", badge: "bg-amber-500" };
    default: return { bg: "bg-slate-500/10", text: "text-slate-600", badge: "bg-slate-500" };
  }
}

function isImageMime(mime: string) {
  return mime.startsWith("image/");
}

function resolveFileUrl(url: string, mime?: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) return url;
  // Images go through image proxy (streaming with cache), documents through download (attachment header)
  if (mime && !mime.startsWith("image/")) {
    return `/api/storage/download?key=${encodeURIComponent(url)}&attachment=1`;
  }
  return `/api/storage/image?key=${encodeURIComponent(url)}`;
}

function getDateLabel(date: Date | string | null) {
  if (!date) return "";
  const d = new Date(date);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, MMMM d");
}

/* ─── Main Page ─── */

export default function ChatPage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const [activeChannelId, setActiveChannelId] = useState<number | null>(null);
  const [showMobileList, setShowMobileList] = useState(true);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [emptyDMOpen, setEmptyDMOpen] = useState(false);
  const [emptyGroupOpen, setEmptyGroupOpen] = useState(false);
  const [showSearchFocus, setShowSearchFocus] = useState(false);

  const heartbeat = useChatHeartbeat();
  useEffect(() => {
    if (!currentUserId) return;
    heartbeat.mutate();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") heartbeat.mutate();
    }, 30_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const handleSelectChannel = useCallback((channelId: number) => {
    setActiveChannelId(channelId);
    setShowMobileList(false);
  }, []);

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Sidebar */}
      <div
        className={cn(
          "w-full md:w-[300px] lg:w-[340px] flex flex-col shrink-0 border-r border-border/40 bg-card/50",
          !showMobileList && "hidden md:flex"
        )}
      >
        <ChannelSidebar
          activeChannelId={activeChannelId}
          onSelectChannel={handleSelectChannel}
          currentUserId={currentUserId ?? ""}
        />
      </div>

      {/* Messages */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0",
          showMobileList && "hidden md:flex"
        )}
      >
        {activeChannelId && currentUserId ? (
          <MessagePanel
            channelId={activeChannelId}
            currentUserId={currentUserId}
            onBack={() => setShowMobileList(true)}
            onToggleInfo={() => setShowInfoPanel((p) => !p)}
            showInfoPanel={showInfoPanel}
          />
        ) : (
          <EmptyChatState
            onNewDM={() => setEmptyDMOpen(true)}
            onNewChannel={() => setEmptyGroupOpen(true)}
            onSearch={() => { setShowMobileList(true); setShowSearchFocus(true); }}
          />
        )}
      </div>

      {/* Info Panel */}
      <AnimatePresence>
        {showInfoPanel && activeChannelId && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="hidden lg:flex flex-col border-l border-border/40 bg-card/50 overflow-hidden shrink-0"
          >
            <ChannelInfoPanel
              channelId={activeChannelId}
              currentUserId={currentUserId ?? ""}
              onClose={() => setShowInfoPanel(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page-level dialogs for empty state buttons */}
      <NewDMDialog open={emptyDMOpen} onOpenChange={setEmptyDMOpen} onCreated={handleSelectChannel} hideTrigger />
      <NewGroupDialog open={emptyGroupOpen} onOpenChange={setEmptyGroupOpen} onCreated={handleSelectChannel} hideTrigger />
    </div>
  );
}

/* ─── Channel Sidebar ─── */

function ChannelSidebar({
  activeChannelId,
  onSelectChannel,
  currentUserId,
}: {
  activeChannelId: number | null;
  onSelectChannel: (id: number) => void;
  currentUserId: string;
}) {
  const { data: rawChannels, isLoading } = useChatChannels();
  const channels = rawChannels as Channel[] | undefined;
  const { data: onlineUsers } = useChatOnlineUsers();
  const [search, setSearch] = useState("");
  const [newDMOpen, setNewDMOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [dmsCollapsed, setDmsCollapsed] = useState(false);
  const [groupsCollapsed, setGroupsCollapsed] = useState(false);

  const onlineUserIds = useMemo(
    () => new Set(onlineUsers?.map((u: { userId: string }) => u.userId) ?? []),
    [onlineUsers]
  );

  const filteredChannels = useMemo(() => {
    if (!channels) return [];
    if (!search) return channels;
    const q = search.toLowerCase();
    return channels.filter(
      (ch) =>
        ch.name.toLowerCase().includes(q) ||
        ch.lastMessage?.content?.toLowerCase().includes(q)
    );
  }, [channels, search]);

  const dms = useMemo(
    () => filteredChannels.filter((c) => c.type === "DIRECT"),
    [filteredChannels]
  );
  const groups = useMemo(
    () => filteredChannels.filter((c) => c.type === "GROUP"),
    [filteredChannels]
  );

  return (
    <>
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#bd882c] to-[#d4a544] flex items-center justify-center shadow-sm">
              <MessageCircle className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Messages</h2>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {onlineUsers?.length ?? 0} online
              </p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <NewDMDialog
              open={newDMOpen}
              onOpenChange={setNewDMOpen}
              onCreated={onSelectChannel}
            />
            <NewGroupDialog
              open={newGroupOpen}
              onOpenChange={setNewGroupOpen}
              onCreated={onSelectChannel}
            />
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-[13px] bg-muted/30 border-border/30 rounded-lg placeholder:text-muted-foreground/40"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 px-2">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-2.5 px-2 py-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-1">
            {groups.length > 0 && (
              <SidebarSection
                title="Channels"
                count={groups.reduce((a, c) => a + c.unreadCount, 0)}
                collapsed={groupsCollapsed}
                onToggle={() => setGroupsCollapsed((p) => !p)}
              >
                {groups.map((ch) => (
                  <ChannelItem
                    key={ch.id}
                    channel={ch}
                    isActive={activeChannelId === ch.id}
                    onClick={() => onSelectChannel(ch.id)}
                    currentUserId={currentUserId}
                    onlineUserIds={onlineUserIds}
                  />
                ))}
              </SidebarSection>
            )}

            {dms.length > 0 && (
              <SidebarSection
                title="Direct Messages"
                count={dms.reduce((a, c) => a + c.unreadCount, 0)}
                collapsed={dmsCollapsed}
                onToggle={() => setDmsCollapsed((p) => !p)}
              >
                {dms.map((ch) => (
                  <ChannelItem
                    key={ch.id}
                    channel={ch}
                    isActive={activeChannelId === ch.id}
                    onClick={() => onSelectChannel(ch.id)}
                    currentUserId={currentUserId}
                    onlineUserIds={onlineUserIds}
                  />
                ))}
              </SidebarSection>
            )}

            {filteredChannels.length === 0 && (
              <div className="text-center py-10 px-4">
                <svg className="w-32 h-28 mx-auto mb-4 text-muted-foreground/20" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="30" y="40" width="90" height="65" rx="12" fill="currentColor" opacity="0.15" />
                  <rect x="80" y="60" width="90" height="65" rx="12" fill="currentColor" opacity="0.25" />
                  <circle cx="70" cy="70" r="4" fill="currentColor" opacity="0.4" />
                  <circle cx="82" cy="70" r="4" fill="currentColor" opacity="0.4" />
                  <circle cx="94" cy="70" r="4" fill="currentColor" opacity="0.4" />
                  <rect x="95" y="78" width="55" height="6" rx="3" fill="currentColor" opacity="0.3" />
                  <rect x="95" y="90" width="40" height="6" rx="3" fill="currentColor" opacity="0.2" />
                  <path d="M30 93 L22 105 L42 93" fill="currentColor" opacity="0.15" />
                  <path d="M170 113 L178 125 L158 113" fill="currentColor" opacity="0.25" />
                </svg>
                <p className="text-[13px] text-muted-foreground font-medium">
                  {search ? "No results found" : "No conversations yet"}
                </p>
                <p className="text-[11px] text-muted-foreground/50 mt-1">
                  {search ? "Try a different search" : "Start a new conversation"}
                </p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </>
  );
}

/* ─── Sidebar Section ─── */

function SidebarSection({
  title,
  count,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider hover:text-foreground transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        <span className="flex-1 text-left">{title}</span>
        {count > 0 && (
          <span className="text-[10px] font-bold bg-[#bd882c] text-white rounded-full h-4 min-w-[16px] flex items-center justify-center px-1">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Channel Item ─── */

function ChannelItem({
  channel,
  isActive,
  onClick,
  currentUserId,
  onlineUserIds,
}: {
  channel: Channel;
  isActive: boolean;
  onClick: () => void;
  currentUserId: string;
  onlineUserIds: Set<string>;
}) {
  const otherMember =
    channel.type === "DIRECT"
      ? channel.members?.find((m) => m.user?.id !== currentUserId)?.user
      : null;

  const displayName =
    channel.type === "DIRECT" ? otherMember?.name ?? "Unknown" : channel.name;

  const isOnline =
    channel.type === "DIRECT" && otherMember
      ? onlineUserIds.has(otherMember.id)
      : false;

  const hasUnread = channel.unreadCount > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-2 py-2 rounded-xl text-left transition-all duration-100 group",
        isActive
          ? "bg-[#bd882c]/10 shadow-sm"
          : "hover:bg-muted/40",
        hasUnread && !isActive && "text-foreground"
      )}
    >
      <div className="relative shrink-0">
        {channel.type === "DIRECT" ? (
          <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
            <AvatarImage src={resolveImageUrl(otherMember?.image)} />
            <AvatarFallback className="text-[11px] font-semibold bg-gradient-to-br from-[#bd882c]/20 to-[#bd882c]/5 text-[#bd882c]">
              {getInitials(otherMember?.name)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#0f2b7f]/10 to-[#0f2b7f]/5 flex items-center justify-center border-2 border-background shadow-sm">
            <Hash className="h-4 w-4 text-[#0f2b7f]" />
          </div>
        )}
        {isOnline && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1.5">
          <p
            className={cn(
              "text-[13px] truncate leading-tight",
              hasUnread || isActive ? "font-bold text-foreground" : "font-medium text-muted-foreground"
            )}
          >
            {displayName}
          </p>
          {channel.lastMessage?.createdAt && (
            <span className="text-[11px] text-muted-foreground shrink-0">
              {formatChannelTime(channel.lastMessage.createdAt)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-1.5 mt-0.5">
          <p className="text-[11px] text-muted-foreground/60 truncate leading-tight">
            {channel.lastMessage?.content
              ? `${channel.type === "GROUP" ? `${channel.lastMessage.senderName?.split(" ")[0]}: ` : ""}${channel.lastMessage.content}`
              : "No messages yet"}
          </p>
          {hasUnread && (
            <span className="h-[18px] min-w-[18px] flex items-center justify-center bg-[#bd882c] text-white text-[10px] font-bold rounded-full px-1 shrink-0">
              {channel.unreadCount > 99 ? "99+" : channel.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ─── Message Panel ─── */

function MessagePanel({
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
  const markRead = useMarkRead();
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

  // Attachments
  const [pendingAttachments, setPendingAttachments] = useState<
    { fileName: string; fileUrl: string; fileKey: string; fileSize: number; mimeType: string }[]
  >([]);
  const [uploading, setUploading] = useState(false);

  // Emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  // Mentions
  const { data: orgUsers } = useChatOrgUsers();
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);

  const filteredMentions = useMemo(() => {
    if (!orgUsers || !mentionQuery) return orgUsers ?? [];
    const q = mentionQuery.toLowerCase();
    return orgUsers.filter((u) => u.name?.toLowerCase().includes(q));
  }, [orgUsers, mentionQuery]);

  // Close emoji picker on outside click
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
    // Deduplicate by message ID (poll invalidation can cause overlap between pages)
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
      queryClient.invalidateQueries({ queryKey: vaivammKeys.chat.messages(channelId) });
      setLastPollTime(new Date().toISOString());
    }
  }, [polledMessages, channelId, queryClient]);

  useEffect(() => {
    if (channelId > 0) markRead.mutate({ channelId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

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

  // File upload handler
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_SIZE) {
          toast.error(`${file.name} is too large (max 10MB)`);
          continue;
        }
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "chat");
        const res = await fetch("/api/storage/upload", { method: "POST", body: formData });
        if (!res.ok) {
          const err = await res.json();
          toast.error(`Failed: ${err.error || file.name}`);
          continue;
        }
        const result = await res.json();
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
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  // Insert emoji at cursor
  const insertEmoji = useCallback((emoji: string) => {
    const el = inputRef.current;
    if (el) {
      const start = el.selectionStart ?? messageInput.length;
      const end = el.selectionEnd ?? messageInput.length;
      const newValue = messageInput.slice(0, start) + emoji + messageInput.slice(end);
      setMessageInput(newValue);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setMessageInput((prev) => prev + emoji);
    }
    setShowEmojiPicker(false);
  }, [messageInput]);

  // Insert @mention
  const insertMention = useCallback((name: string) => {
    const el = inputRef.current;
    if (!el) return;
    // Find the @ position
    const text = messageInput;
    const cursorPos = el.selectionStart ?? text.length;
    const beforeCursor = text.slice(0, cursorPos);
    const atIdx = beforeCursor.lastIndexOf("@");
    if (atIdx === -1) return;
    const newValue = text.slice(0, atIdx) + `@${name} ` + text.slice(cursorPos);
    setMessageInput(newValue);
    setShowMentions(false);
    setMentionQuery("");
    setTimeout(() => {
      el.focus();
      const pos = atIdx + name.length + 2;
      el.setSelectionRange(pos, pos);
    }, 0);
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
      await sendMessage.mutateAsync({
        channelId,
        content: content || undefined,
        replyToId: replyId,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch {
      setMessageInput(content);
      setPendingAttachments(attachments);
      toast.error("Failed to send message");
    }
  }, [messageInput, channelId, replyTo, sendMessage, pendingAttachments]);

  const handleEdit = useCallback(
    async (messageId: number) => {
      const content = editInput.trim();
      if (!content) return;
      try {
        await editMessage.mutateAsync({ messageId, content });
        setEditingMessage(null);
        setEditInput("");
      } catch {
        toast.error("Failed to edit message");
      }
    },
    [editInput, editMessage]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Mention navigation
      if (showMentions && filteredMentions.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setMentionIndex((prev) => (prev + 1) % filteredMentions.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setMentionIndex((prev) => (prev - 1 + filteredMentions.length) % filteredMentions.length);
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
    [handleSend, showMentions, filteredMentions, mentionIndex, insertMention]
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessageInput(value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";

    // Send typing indicator (throttled to once per 3s)
    if (value.trim() && Date.now() - lastTypingSent.current > 3000) {
      lastTypingSent.current = Date.now();
      setTyping.mutate({ channelId });
    }

    // Check for @mention trigger
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
  }, []);

  const otherMember =
    channel?.type === "DIRECT"
      ? channel.members?.find((m) => m.user?.id !== currentUserId)?.user
      : null;
  const displayName =
    channel?.type === "DIRECT" ? otherMember?.name ?? "Unknown" : channel?.name ?? "Chat";
  const memberCount = channel?.members?.length ?? 0;
  const isOtherOnline =
    channel?.type === "DIRECT" && otherMember ? onlineUserIds.has(otherMember.id) : false;

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
      {/* Header */}
      <div className="h-[56px] px-4 border-b border-border/40 flex items-center gap-3 shrink-0 bg-card/80 backdrop-blur-sm">
        <button
          onClick={onBack}
          className="md:hidden p-1.5 -ml-1 hover:bg-muted/50 rounded-lg"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          {channel?.type === "DIRECT" ? (
            <div className="relative">
              <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                <AvatarImage src={resolveImageUrl(otherMember?.image)} />
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
        style={{
          backgroundImage: "radial-gradient(circle at 50% 50%, hsl(var(--muted) / 0.3) 0%, transparent 70%)",
        }}
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="h-7 text-[12px] rounded-full px-4"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                      Loading...
                    </>
                  ) : (
                    "Load older messages"
                  )}
                </Button>
              </div>
            )}

            {groupedMessages.map((group) => (
              <Fragment key={group.date}>
                {/* Date separator */}
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
                  // Add extra gap if more than 2 minutes between consecutive messages
                  const timeDiff = prevMsg?.createdAt && msg.createdAt
                    ? new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()
                    : 0;
                  const isTimeGap = timeDiff > 2 * 60 * 1000;
                  const showHeader = !isSameSender || isTimeGap;

                  return (
                    <ChatBubble
                      key={msg.id}
                      message={msg}
                      isOwn={isOwn}
                      showSender={showHeader}
                      isEditing={editingMessage?.id === msg.id}
                      editInput={editingMessage?.id === msg.id ? editInput : ""}
                      onEditInputChange={setEditInput}
                      onStartEdit={() => {
                        setEditingMessage(msg);
                        setEditInput(msg.content ?? "");
                      }}
                      onCancelEdit={() => {
                        setEditingMessage(null);
                        setEditInput("");
                      }}
                      onSaveEdit={() => handleEdit(msg.id)}
                      onReply={() => {
                        setReplyTo(msg);
                        inputRef.current?.focus();
                      }}
                      onDelete={() => deleteMessage.mutate({ messageId: msg.id })}
                    />
                  );
                })}
              </Fragment>
            ))}

            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#bd882c]/15 to-[#bd882c]/5 flex items-center justify-center mb-3">
                  <MessageCircle className="h-5 w-5 text-[#bd882c]" />
                </div>
                <h4 className="text-[14px] font-semibold mb-0.5">
                  {channel?.type === "DIRECT"
                    ? `Start a conversation with ${displayName}`
                    : `Welcome to #${displayName}`}
                </h4>
                <p className="text-[12px] text-muted-foreground max-w-xs text-center">
                  Send a message to get things started.
                </p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Scroll to bottom */}
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
                <p className="text-[12px] font-bold text-[#bd882c]">
                  Replying to {replyTo.sender?.name}
                </p>
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
          {/* Mention dropdown */}
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
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/30">
                      Members
                    </div>
                    {filteredMentions.slice(0, 8).map((user, idx) => (
                      <button
                        key={user.id}
                        onClick={() => insertMention(user.name ?? "")}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/40 transition-colors",
                          idx === mentionIndex && "bg-[#bd882c]/10"
                        )}
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

          {/* Emoji picker */}
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

          {/* Pending attachments preview */}
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {pendingAttachments.map((att, idx) => {
                const colors = getFileColor(att.fileName);
                return (
                  <div
                    key={idx}
                    className="relative group flex items-center gap-2.5 bg-background border border-border rounded-xl px-3 py-2 shadow-sm"
                  >
                    {att.mimeType.startsWith("image/") ? (
                      <img src={att.fileUrl} alt={att.fileName} className="h-11 w-11 rounded-lg object-cover border border-border/30" />
                    ) : (
                      <div className={cn("h-11 w-11 rounded-lg flex flex-col items-center justify-center relative", colors.bg)}>
                        <FileText className={cn("h-5 w-5", colors.text)} />
                        <span className={cn("text-[7px] font-bold text-white px-1 rounded mt-0.5", colors.badge)}>
                          {getFileExt(att.fileName)}
                        </span>
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
              <span className="text-xs text-muted-foreground/70 italic animate-pulse">
                {typingText}
              </span>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-background shadow-md focus-within:border-[#bd882c]/50 focus-within:shadow-lg transition-all">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
            />

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
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className={cn(
                    "p-2 rounded-lg hover:bg-muted/60 transition-colors",
                    uploading ? "text-[#bd882c] animate-pulse" : "text-muted-foreground/70 hover:text-foreground"
                  )}
                  title="Attach file (max 10MB)"
                >
                  <Paperclip className="h-[18px] w-[18px]" />
                </button>
                <button
                  onClick={() => {
                    setShowEmojiPicker((p) => !p);
                    setShowMentions(false);
                  }}
                  className={cn(
                    "p-2 rounded-lg hover:bg-muted/60 transition-colors",
                    showEmojiPicker ? "text-[#bd882c] bg-muted/50" : "text-muted-foreground/70 hover:text-foreground"
                  )}
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
                      setTimeout(() => {
                        el.focus();
                        el.setSelectionRange(pos + 1, pos + 1);
                      }, 0);
                    }
                  }}
                  className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground/70 hover:text-foreground transition-colors"
                  title="Mention someone"
                >
                  <AtSign className="h-[18px] w-[18px]" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground/50 hidden sm:inline">
                  Shift+Enter for new line
                </span>
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
                  {sendMessage.isPending ? (
                    <Loader2 className="h-[18px] w-[18px] animate-spin" />
                  ) : (
                    <Send className="h-[18px] w-[18px]" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Chat Bubble (WhatsApp-style: sender right, receiver left) ─── */

function ChatBubble({
  message,
  isOwn,
  showSender,
  isEditing,
  editInput,
  onEditInputChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onReply,
  onDelete,
}: {
  message: Message;
  isOwn: boolean;
  showSender: boolean;
  isEditing: boolean;
  editInput: string;
  onEditInputChange: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onReply: () => void;
  onDelete: () => void;
}) {
  if (message.isDeleted) {
    return (
      <div className={cn("flex mb-[2px]", isOwn ? "justify-end" : "justify-start", !isOwn && "ml-9")}>
        <div className="px-3 py-1 rounded-xl bg-muted/20 border border-border/15">
          <p className="text-[11px] text-muted-foreground/40 italic flex items-center gap-1.5">
            <Trash2 className="h-2.5 w-2.5" />
            Message deleted
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex gap-2",
        isOwn ? "justify-end" : "justify-start",
        showSender ? "mt-3 mb-0.5" : "mb-[2px]"
      )}
    >
      {/* Avatar for receiver (left side) */}
      {!isOwn && (
        <div className="w-7 shrink-0 self-end">
          {showSender ? (
            <Avatar className="h-7 w-7 border border-border/30 shadow-sm">
              <AvatarImage src={resolveImageUrl(message.sender?.image)} />
              <AvatarFallback className="text-[8px] font-bold bg-gradient-to-br from-blue-100 to-indigo-50 text-[#0f2b7f]">
                {getInitials(message.sender?.name)}
              </AvatarFallback>
            </Avatar>
          ) : <div className="w-7" />}
        </div>
      )}

      {/* Bubble */}
      <div className={cn("max-w-[75%] sm:max-w-[65%] relative flex flex-col", isOwn ? "items-end" : "items-start")}>
        {/* Sender name for group messages */}
        {showSender && !isOwn && (
          <p className="text-[11px] font-bold text-[#0f2b7f] mb-1 px-1 ml-1">
            {message.sender?.name}
          </p>
        )}

        {/* Reply reference */}
        {message.replyTo && (
          <div
            className={cn(
              "mx-1 mb-0.5 px-2.5 py-1.5 rounded-lg border text-[11px]",
              isOwn
                ? "bg-[#bd882c]/5 border-[#bd882c]/15"
                : "bg-[#0f2b7f]/5 border-[#0f2b7f]/10"
            )}
          >
            <p className={cn("font-bold", isOwn ? "text-[#bd882c]" : "text-[#0f2b7f]")}>
              {message.replyTo.sender?.name}
            </p>
            <p className="text-muted-foreground truncate">{message.replyTo.content}</p>
          </div>
        )}

        {/* Message bubble */}
        {isEditing ? (
          <div className="mx-1">
            <div className="rounded-xl border border-[#bd882c]/40 bg-background overflow-hidden shadow-sm">
              <textarea
                value={editInput}
                onChange={(e) => onEditInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSaveEdit();
                  }
                  if (e.key === "Escape") onCancelEdit();
                }}
                className="w-full bg-transparent text-[14px] resize-none px-3 py-2 focus:outline-none min-h-[40px]"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2 mt-1 px-1">
              <button onClick={onCancelEdit} className="text-[11px] text-muted-foreground hover:text-foreground">
                Cancel
              </button>
              <span className="text-muted-foreground/30">|</span>
              <button onClick={onSaveEdit} className="text-[11px] text-[#bd882c] font-bold hover:underline">
                Save
              </button>
              <span className="text-[10px] text-muted-foreground/30 ml-auto hidden sm:inline">
                Esc / Enter
              </span>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "relative px-3.5 py-2 shadow-sm",
              isOwn
                ? "bg-gradient-to-br from-[#bd882c] to-[#c9963a] text-white rounded-2xl rounded-br-md"
                : "bg-card border border-border/40 text-foreground rounded-2xl rounded-bl-md"
            )}
          >
            {/* Content */}
            {message.content && (
              <p className={cn(
                "text-[14px] whitespace-pre-wrap break-words leading-[1.55]",
                isOwn ? "text-white" : "text-foreground"
              )}>
                {message.content}
              </p>
            )}

            {/* Attachments */}
            {message.attachments.length > 0 && (
              <div className="mt-1.5 space-y-1.5">
                {message.attachments.map((att) => {
                  const url = resolveFileUrl(att.fileUrl, att.mimeType);
                  return isImageMime(att.mimeType) ? (
                    <a
                      key={att.id}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg overflow-hidden"
                    >
                      <img
                        src={url}
                        alt={att.fileName}
                        className="max-w-[280px] max-h-[200px] object-cover rounded-lg"
                        loading="lazy"
                      />
                    </a>
                  ) : (() => {
                    const colors = getFileColor(att.fileName);
                    return (
                    <a
                      key={att.id}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors",
                        isOwn
                          ? "bg-white/10 border-white/15 hover:bg-white/20"
                          : "bg-background border-border/50 hover:bg-muted/30 shadow-sm"
                      )}
                    >
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex flex-col items-center justify-center shrink-0",
                        isOwn ? "bg-white/15" : colors.bg
                      )}>
                        <FileText className={cn("h-4 w-4", isOwn ? "text-white/80" : colors.text)} />
                        <span className={cn(
                          "text-[6px] font-bold text-white px-1 rounded mt-0.5",
                          isOwn ? "bg-white/30" : colors.badge
                        )}>
                          {getFileExt(att.fileName)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold truncate max-w-[180px]">{att.fileName}</p>
                        <p className={cn("text-[10px] mt-0.5", isOwn ? "text-white/60" : "text-muted-foreground")}>
                          {formatFileSize(att.fileSize)} · {getFileExt(att.fileName)}
                        </p>
                      </div>
                      <ArrowDown className={cn("h-4 w-4 shrink-0", isOwn ? "text-white/50" : "text-muted-foreground/50")} />
                    </a>
                    );
                  })();
                })}
              </div>
            )}

            {/* Time + status */}
            <div className={cn("flex items-center gap-1.5 mt-1", isOwn ? "justify-end" : "justify-start")}>
              <span
                className={cn("text-[11px] font-medium", isOwn ? "text-white/80" : "text-muted-foreground")}
                title={formatMessageTimeFull(message.createdAt)}
              >
                {formatMessageTime(message.createdAt)}
              </span>
              {message.isEdited && (
                <span className={cn("text-[11px]", isOwn ? "text-white/60" : "text-muted-foreground/70")}>
                  edited
                </span>
              )}
              {isOwn && <CheckCheck className={cn("h-3.5 w-3.5", "text-white/70")} />}
            </div>
          </div>
        )}

        {/* Hover actions */}
        {!isEditing && (
          <div
            className={cn(
              "absolute -top-3 opacity-0 group-hover:opacity-100 transition-all z-10",
              isOwn ? "left-0" : "right-0"
            )}
          >
            <div className="flex items-center bg-background border border-border/60 rounded-lg shadow-md overflow-hidden">
              <button onClick={onReply} className="p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground" title="Reply">
                <Reply className="h-3.5 w-3.5" />
              </button>
              {message.content && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(message.content!);
                    toast.success("Copied");
                  }}
                  className="p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  title="Copy"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              )}
              {isOwn && (
                <button onClick={onStartEdit} className="p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground" title="Edit">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {isOwn && (
                <button onClick={onDelete} className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-400" title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Channel Info Panel ─── */

function ChannelInfoPanel({
  channelId,
  currentUserId,
  onClose,
}: {
  channelId: number;
  currentUserId: string;
  onClose: () => void;
}) {
  const { data: channel } = useChatChannel(channelId);
  const { data: onlineUsers } = useChatOnlineUsers();
  const updateChannel = useUpdateChannel();
  const onlineUserIds = useMemo(
    () => new Set(onlineUsers?.map((u: { userId: string }) => u.userId) ?? []),
    [onlineUsers]
  );

  const isAdmin = channel?.members?.some(
    (m) => m.user?.id === currentUserId && m.role === "ADMIN"
  );
  const isGroup = channel?.type === "GROUP";

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const editAvatarRef = useRef<HTMLInputElement>(null);

  const startEditing = () => {
    setEditName(channel?.name ?? "");
    setEditDesc(channel?.description ?? "");
    setEditAvatar(channel?.avatarUrl ?? "");
    setEditing(true);
  };

  const handleEditAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "chat-avatars");
      const res = await fetch("/api/storage/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) setEditAvatar(data.url);
      else toast.error("Upload failed");
    } catch { toast.error("Upload failed"); }
    finally { setUploadingAvatar(false); if (editAvatarRef.current) editAvatarRef.current.value = ""; }
  };

  const handleSaveEdit = async () => {
    try {
      await updateChannel.mutateAsync({
        channelId,
        name: editName.trim() || undefined,
        description: editDesc.trim(),
        avatarUrl: editAvatar,
      });
      setEditing(false);
      toast.success("Channel updated");
    } catch { toast.error("Failed to update channel"); }
  };

  const otherMember =
    channel?.type === "DIRECT"
      ? channel.members?.find((m) => m.user?.id !== currentUserId)?.user
      : null;
  const displayName =
    channel?.type === "DIRECT" ? otherMember?.name ?? "Unknown" : channel?.name ?? "Channel";

  return (
    <div className="flex flex-col h-full w-80">
      <div className="h-[56px] px-4 border-b border-border/40 flex items-center justify-between shrink-0">
        <h3 className="text-[14px] font-bold">Details</h3>
        <div className="flex items-center gap-1">
          {isGroup && isAdmin && !editing && (
            <button onClick={startEditing} className="p-1.5 hover:bg-muted rounded-lg" title="Edit channel">
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {editing ? (
            <div className="space-y-4 mb-6">
              {/* Avatar edit */}
              <div className="flex justify-center">
                <input ref={editAvatarRef} type="file" accept="image/*" onChange={handleEditAvatarUpload} className="hidden" />
                <button type="button" onClick={() => editAvatarRef.current?.click()} disabled={uploadingAvatar} className="relative group">
                  {editAvatar ? (
                    <div className="h-20 w-20 rounded-2xl overflow-hidden border-2 border-border/40">
                      <img src={resolveImageUrl(editAvatar)} alt="Avatar" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[#0f2b7f]/10 to-[#0f2b7f]/5 flex items-center justify-center border border-[#0f2b7f]/10">
                      {uploadingAvatar ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <ImageIcon className="h-6 w-6 text-[#0f2b7f]/40" />}
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                </button>
              </div>
              <div>
                <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Name</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-[13px] bg-muted/30" />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Description</Label>
                <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Add a description..." className="h-8 text-[13px] bg-muted/30" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(false)} className="flex-1 h-8 text-[12px]">Cancel</Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={updateChannel.isPending || !editName.trim()} className="flex-1 h-8 text-[12px] bg-[#bd882c] hover:bg-[#bd882c]/90 text-white">
                  {updateChannel.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>
          ) : (
          <div className="flex flex-col items-center text-center mb-6">
            {channel?.type === "DIRECT" ? (
              <Avatar className="h-20 w-20 mb-3 border-2 border-border/30 shadow-md">
                <AvatarImage src={resolveImageUrl(otherMember?.image)} />
                <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-[#bd882c]/20 to-[#bd882c]/5 text-[#bd882c]">
                  {getInitials(otherMember?.name)}
                </AvatarFallback>
              </Avatar>
            ) : channel?.avatarUrl ? (
              <div className="h-20 w-20 rounded-2xl overflow-hidden mb-3 border-2 border-border/30 shadow-md">
                <img src={resolveImageUrl(channel.avatarUrl)} alt={channel.name} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[#0f2b7f]/10 to-[#0f2b7f]/5 flex items-center justify-center mb-3 border border-[#0f2b7f]/10">
                <Hash className="h-8 w-8 text-[#0f2b7f]" />
              </div>
            )}
            <h4 className="text-[17px] font-bold">{displayName}</h4>
            {channel?.type === "DIRECT" ? (
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {otherMember
                  ? onlineUserIds.has(otherMember.id)
                    ? "Online"
                    : "Offline"
                  : ""}
              </p>
            ) : (
              channel?.description && (
                <p className="text-[12px] text-muted-foreground mt-1 max-w-[240px]">
                  {channel.description}
                </p>
              )
            )}
          </div>
          )}

          <div>
            <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">
              Members ({channel?.members?.length ?? 0})
            </h5>
            <div className="space-y-0.5">
              {channel?.members?.map((m) => {
                const isOnline = onlineUserIds.has(m.user?.id ?? "");
                const isYou = m.user?.id === currentUserId;
                return (
                  <div
                    key={m.user?.id}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={resolveImageUrl(m.user?.image)} />
                        <AvatarFallback className="text-[10px] font-medium">
                          {getInitials(m.user?.name)}
                        </AvatarFallback>
                      </Avatar>
                      {isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">
                        {m.user?.name}
                        {isYou && <span className="text-muted-foreground font-normal"> (you)</span>}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">{m.user?.email}</p>
                    </div>
                    {m.role === "ADMIN" && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-[#bd882c]/30 text-[#bd882c]">
                        Admin
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {channel?.createdAt && (
            <div className="mt-6 pt-4 border-t border-border/30">
              <p className="text-[11px] text-muted-foreground/50 text-center">
                {channel.type === "GROUP"
                  ? `Created ${formatDistanceToNow(new Date(channel.createdAt), { addSuffix: true })}`
                  : `Started ${formatDistanceToNow(new Date(channel.createdAt), { addSuffix: true })}`}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

/* ─── New DM Dialog ─── */

function NewDMDialog({
  open,
  onOpenChange,
  onCreated,
  hideTrigger,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (channelId: number) => void;
  hideTrigger?: boolean;
}) {
  const { data: orgUsers, isLoading } = useChatOrgUsers();
  const { data: onlineUsers } = useChatOnlineUsers();
  const createDM = useCreateDM();
  const [search, setSearch] = useState("");

  const onlineUserIds = useMemo(
    () => new Set(onlineUsers?.map((u: { userId: string }) => u.userId) ?? []),
    [onlineUsers]
  );

  const filteredUsers = useMemo(() => {
    if (!orgUsers) return [];
    if (!search) return orgUsers;
    const q = search.toLowerCase();
    return orgUsers.filter(
      (u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
  }, [orgUsers, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" title="New Direct Message">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3">
          <DialogTitle className="text-[16px]">New Direct Message</DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-muted/30 border-border/30"
              autoFocus
            />
          </div>
        </div>
        <ScrollArea className="h-[340px] border-t border-border/30">
          <div className="p-1">
            {filteredUsers.map((user) => {
              const isOnline = onlineUserIds.has(user.id);
              return (
                <button
                  key={user.id}
                  onClick={async () => {
                    try {
                      const channel = await createDM.mutateAsync({ targetUserId: user.id });
                      onCreated(channel.id);
                      onOpenChange(false);
                      setSearch("");
                    } catch {
                      toast.error("Failed to create conversation");
                    }
                  }}
                  disabled={createDM.isPending}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors"
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={resolveImageUrl(user.image)} />
                      <AvatarFallback className="text-[10px] font-medium">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    {isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-[13px] font-medium truncate">{user.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0 border-border/40">
                    {user.role}
                  </Badge>
                </button>
              );
            })}
            {filteredUsers.length === 0 && !isLoading && (
              <div className="text-center py-10">
                <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-[13px] text-muted-foreground">No users found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

/* ─── New Group Dialog ─── */

function NewGroupDialog({
  open,
  onOpenChange,
  onCreated,
  hideTrigger,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (channelId: number) => void;
  hideTrigger?: boolean;
}) {
  const { data: orgUsers } = useChatOrgUsers();
  const createGroup = useCreateGroupChannel();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [step, setStep] = useState<"info" | "members">("info");

  const filteredUsers = useMemo(() => {
    if (!orgUsers) return [];
    if (!search) return orgUsers;
    const q = search.toLowerCase();
    return orgUsers.filter(
      (u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
  }, [orgUsers, search]);

  const toggleUser = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "chat-avatars");
      const res = await fetch("/api/storage/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) setAvatarUrl(data.url);
      else toast.error("Upload failed");
    } catch { toast.error("Upload failed"); }
    finally { setUploadingAvatar(false); if (avatarInputRef.current) avatarInputRef.current.value = ""; }
  };

  const handleCreate = async () => {
    if (!name.trim() || selectedIds.size === 0) return;
    try {
      const channel = await createGroup.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
        memberIds: Array.from(selectedIds),
      });
      onCreated(channel.id);
      onOpenChange(false);
      setName("");
      setDescription("");
      setAvatarUrl("");
      setSelectedIds(new Set());
      setSearch("");
      setStep("info");
    } catch {
      toast.error("Failed to create channel");
    }
  };

  const resetAndClose = (open: boolean) => {
    if (!open) {
      setStep("info");
      setName("");
      setDescription("");
      setAvatarUrl("");
      setSelectedIds(new Set());
      setSearch("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" title="New Channel">
            <Users className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3">
          <DialogTitle className="text-[16px]">
            {step === "info" ? "Create Channel" : "Add Members"}
          </DialogTitle>
        </DialogHeader>

        {step === "info" ? (
          <div className="px-4 pb-4 space-y-4">
            {/* Avatar upload */}
            <div className="flex justify-center">
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="relative group"
              >
                {avatarUrl ? (
                  <div className="h-16 w-16 rounded-xl overflow-hidden border-2 border-border/40">
                    <img src={resolveImageUrl(avatarUrl)} alt="Channel avatar" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="h-16 w-16 rounded-xl bg-muted/40 border-2 border-dashed border-border/60 flex items-center justify-center">
                    {uploadingAvatar ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <Camera className="h-5 w-5 text-muted-foreground/50" />
                    )}
                  </div>
                )}
                <div className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-4 w-4 text-white" />
                </div>
              </button>
            </div>
            <div>
              <Label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">
                Channel name
              </Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                <Input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))
                  }
                  placeholder="e.g. design-team"
                  className="pl-9 h-9 bg-muted/30 border-border/30"
                  autoFocus
                />
              </div>
            </div>
            <div>
              <Label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">
                Description <span className="text-muted-foreground/50">(optional)</span>
              </Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this channel about?"
                className="h-9 bg-muted/30 border-border/30"
              />
            </div>
            <Button
              onClick={() => setStep("members")}
              disabled={!name.trim()}
              className="w-full bg-[#bd882c] hover:bg-[#bd882c]/90 text-white h-9"
            >
              Next: Add Members
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        ) : (
          <div className="pb-4">
            <div className="px-4 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input
                  placeholder="Search people..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 bg-muted/30 border-border/30"
                  autoFocus
                />
              </div>
              {selectedIds.size > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {Array.from(selectedIds).map((id) => {
                    const user = orgUsers?.find((u) => u.id === id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 bg-[#bd882c]/10 text-[#bd882c] rounded-full px-2 py-0.5 text-[11px] font-medium"
                      >
                        {user?.name?.split(" ")[0]}
                        <button onClick={() => toggleUser(id)} className="hover:bg-[#bd882c]/20 rounded-full p-0.5">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <ScrollArea className="h-[240px] border-t border-border/30">
              <div className="p-1">
                {filteredUsers.map((user) => {
                  const selected = selectedIds.has(user.id);
                  return (
                    <button
                      key={user.id}
                      onClick={() => toggleUser(user.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors",
                        selected && "bg-[#bd882c]/5"
                      )}
                    >
                      <div
                        className={cn(
                          "h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                          selected ? "bg-[#bd882c] border-[#bd882c] text-white" : "border-border/60"
                        )}
                      >
                        {selected && <Check className="h-3 w-3" />}
                      </div>
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage src={resolveImageUrl(user.image)} />
                        <AvatarFallback className="text-[9px]">{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <p className="text-[13px] font-medium truncate flex-1 text-left">{user.name}</p>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="px-4 pt-3 flex gap-2">
              <Button variant="outline" onClick={() => setStep("info")} className="flex-1 h-9">
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={selectedIds.size === 0 || createGroup.isPending}
                className="flex-1 bg-[#bd882c] hover:bg-[#bd882c]/90 text-white h-9"
              >
                {createGroup.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Creating...
                  </>
                ) : (
                  `Create with ${selectedIds.size} member${selectedIds.size !== 1 ? "s" : ""}`
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Empty State ─── */

/* ─── Emoji Grid ─── */

const EMOJI_CATEGORIES = [
  {
    name: "Smileys",
    emojis: ["😀","😂","🤣","😊","😍","🥰","😘","😎","🤩","🥳","😅","😆","😉","🙂","😋","😜","🤗","🤔","😏","😌","😴","🥺","😢","😭","😤","🤯","🥵","🥶","😱","🤮","🤧","😷"],
  },
  {
    name: "Hands",
    emojis: ["👍","👎","👏","🙌","🤝","✌️","🤞","🤟","🤙","👋","💪","🙏","✊","👊","🫡","🫶"],
  },
  {
    name: "Hearts",
    emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","💔","❤️‍🔥","💯","💢","💥","✨","🔥","⭐"],
  },
  {
    name: "Objects",
    emojis: ["📎","📁","📂","💼","📝","📌","📍","🔗","💡","🎯","🚀","⚡","🏆","🎉","🎊","🔔","📣","💬","💭","🗓️","⏰","✅","❌","⚠️","🔒","🔑"],
  },
  {
    name: "Reactions",
    emojis: ["👀","💀","🫠","🤡","🤖","👻","😈","💩","🎃","🦄","🐛","🌈","☀️","🌙","🍕","☕","🍺","🎵"],
  },
];

function EmojiGrid({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="bg-background border border-border/60 rounded-xl shadow-lg w-[320px] overflow-hidden">
      {/* Category tabs */}
      <div className="flex border-b border-border/30 px-1 pt-1 gap-0.5">
        {EMOJI_CATEGORIES.map((cat, idx) => (
          <button
            key={cat.name}
            onClick={() => setActiveTab(idx)}
            className={cn(
              "px-2 py-1.5 text-[10px] font-medium rounded-t-md transition-colors",
              idx === activeTab
                ? "bg-[#bd882c]/10 text-[#bd882c]"
                : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/40"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="p-2 h-[180px] overflow-y-auto">
        <div className="grid grid-cols-8 gap-0.5">
          {EMOJI_CATEGORIES[activeTab].emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSelect(emoji)}
              className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted/50 text-lg transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Empty State ─── */

function EmptyChatState({
  onNewDM,
  onNewChannel,
  onSearch,
}: {
  onNewDM: () => void;
  onNewChannel: () => void;
  onSearch: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div className="relative mb-4">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#bd882c]/15 to-[#bd882c]/5 flex items-center justify-center">
          <MessageCircle className="h-7 w-7 text-[#bd882c]" />
        </div>
        <div className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>
      <h3 className="text-lg font-bold mb-1">Welcome to Chat</h3>
      <p className="text-[13px] text-muted-foreground max-w-xs leading-relaxed">
        Select a conversation or start a new one.
      </p>
      <div className="flex items-center gap-6 mt-5">
        <button onClick={onNewDM} className="flex flex-col items-center gap-1.5 group">
          <div className="h-10 w-10 rounded-xl bg-muted/40 flex items-center justify-center group-hover:bg-[#bd882c]/10 group-hover:text-[#bd882c] text-muted-foreground transition-colors">
            <Plus className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">New DM</span>
        </button>
        <button onClick={onNewChannel} className="flex flex-col items-center gap-1.5 group">
          <div className="h-10 w-10 rounded-xl bg-muted/40 flex items-center justify-center group-hover:bg-[#bd882c]/10 group-hover:text-[#bd882c] text-muted-foreground transition-colors">
            <Hash className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">Channel</span>
        </button>
        <button onClick={onSearch} className="flex flex-col items-center gap-1.5 group">
          <div className="h-10 w-10 rounded-xl bg-muted/40 flex items-center justify-center group-hover:bg-[#bd882c]/10 group-hover:text-[#bd882c] text-muted-foreground transition-colors">
            <Search className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">Search</span>
        </button>
      </div>
    </div>
  );
}
