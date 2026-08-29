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

export function MessagePanelView(props: any) {
  const { onBack, displayName, activeHuddle, isInHuddle, handleHuddle, startHuddle, joinHuddle, canUseAi, summarizeAction, channelId, handleToggleFiles, handleToggleSaved, onToggleInfo, showInfoPanel, isSidebarCollapsed, onToggleSidebar, channel, otherMember, isOtherOnline, memberCount, showFilesPanel, showSavedPanel, isOnline, groupedMessages, messages, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage, currentUserId, editingMessage, editInput, replyTo, pinnedMessageIds, savedMessageIds, replyCountMap, firstUnreadMessageId, setEditInput, setEditingMessage, setReplyTo, inputRef, deleteMessage, handleEdit, handleOpenThread, handleReact, handlePin, handleUnpin, handleSave, handleUnsaveMsg, handleForward, resolveUserName, showScrollBtn, scrollToBottom, messagesEndRef, scrollContainerRef, handleScroll, messageInput, setMessageInput, pendingAttachments, setPendingAttachments, uploading, fileInputRef, handleFileSelect, showEmojiPicker, setShowEmojiPicker, emojiRef, insertEmoji, showMentions, setShowMentions, mentionQuery, mentionIndex, setMentionIndex, filteredMentions, insertMention, showTicketPicker, ticketQuery, ticketSelectedIndex, insertTicket, typingText, sendMessage, handleSend, handleKeyDown, handleInputChange, handlePastedFiles, threadMessageId, handleCloseThread, isChatMobile, setShowFilesPanel, setShowSavedPanel, forwardMessage, setForwardMessage } = props;
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
                {channel.members?.slice(0, 3).map((m: any) => (
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
