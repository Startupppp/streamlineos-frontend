"use client";

import React from "react";
import dynamic from "next/dynamic";
import { ArrowLeft } from "lucide-react";
import { MicIcon, UsersIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { AnimatePresence, motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { AiAction } from "@/components/ai";
import { useIsChatPanelNarrow } from "./use-chat-mobile";
import { ChannelAvatar } from "./channel-avatar";
import { MessagePanelWorkspace } from "./message-panel-workspace";
import { ChatNarrowThreadActions } from "./chat-narrow-thread-actions";
import { MessagePanelSidePanels } from "./message-panel-side-panels";
import { BookmarkButton, PaperclipButton } from "./message-panel-actions";
import {
  ChatPanelFallback,
  ChatTriggerFallback,
} from "./chat-lazy-fallbacks";
import type { ChannelMember, Huddle } from "@/types/chat";
import type { ChatChannelDetailWire } from "@/hooks/api/chat-extra-schema";
import { getInitials } from "@/lib/format-utils";

const ThreadPanel = dynamic(
  () => import("./thread-panel").then((m) => ({ default: m.ThreadPanel })),
  { ssr: false, loading: () => <ChatPanelFallback label="Loading thread" /> },
);

/**
 * The trigger is a fixed-size toolbar button, so the fallback matches its box
 * rather than collapsing the header row while the AI chunk lands.
 */
const AiActionsMenu = dynamic(
  () => import("@/components/ai").then((m) => ({ default: m.AiActionsMenu })),
  {
    ssr: false,
    loading: () => <ChatTriggerFallback label="Loading AI actions" />,
  },
);

interface PanelHeaderProps {
  onBack: () => void;
  displayName: string;
  channel: ChatChannelDetailWire | undefined;
  otherMember:
    | { id: string; name?: string | null; image?: string | null }
    | null
    | undefined;
  isOtherOnline: boolean;
  memberCount: number;
  activeHuddle: Huddle | null | undefined;
  isInHuddle: boolean;
  onHuddle: () => void;
  huddleStartPending: boolean;
  huddleJoinPending: boolean;
  canUseAi: boolean;
  summarizeAction: AiAction;
  channelId: number;
  onToggleFiles: () => void;
  onToggleSaved: () => void;
  showFilesPanel: boolean;
  showSavedPanel: boolean;
  onToggleInfo: () => void;
  showInfoPanel: boolean;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

interface ThreadProps {
  messageId: number | null;
  channelId: number;
  currentUserId: string;
  onClose: () => void;
}

interface MessagePanelViewProps {
  header: PanelHeaderProps;
  workspace: React.ComponentProps<typeof MessagePanelWorkspace>;
  thread: ThreadProps;
  sidePanels: React.ComponentProps<typeof MessagePanelSidePanels>;
  isOnline: boolean;
  isReconnecting: boolean;
}

export function MessagePanelView({
  header,
  workspace,
  thread,
  sidePanels,
  isOnline,
  isReconnecting,
}: MessagePanelViewProps) {
  const {
    onBack,
    displayName,
    channel,
    otherMember,
    isOtherOnline,
    memberCount,
    activeHuddle,
    isInHuddle,
    onHuddle,
    huddleStartPending,
    huddleJoinPending,
    canUseAi,
    summarizeAction,
    channelId,
    onToggleFiles,
    onToggleSaved,
    showFilesPanel,
    showSavedPanel,
    onToggleInfo,
    showInfoPanel,
  } = header;

  const isPanelNarrow = useIsChatPanelNarrow();
  const isThreadOpen = thread.messageId !== null;
  const dropdownTriggerRef = React.useRef<HTMLButtonElement>(null);

  function handleThreadOpenChange(open: boolean) {
    if (!open) thread.onClose();
  }

  return (
    <div className="flex flex-1 min-w-0 overflow-hidden">
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {isPanelNarrow && (
        <div className="flex min-h-14 shrink-0 items-center gap-2 border-b border-border/40 bg-card/80 px-3">
          <button
            type="button"
            className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onBack}
            aria-label="Back to conversations"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <TruncatedText
              text={displayName}
              className="text-sm font-semibold"
            />
          </div>
        </div>
        )}

        {!isPanelNarrow && (
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border/40 bg-card/80 px-4 sticky top-0 z-20">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg p-1.5 hover:bg-muted/50 lg:hidden"
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
              <TruncatedText
                text={displayName}
                className="text-sm font-bold leading-tight"
              />
              <p className="text-dense text-muted-foreground leading-tight">
                {channel?.type === "DIRECT" ? (
                  isOtherOnline ? (
                    <span className="text-status-success-ink font-medium">
                      Online
                    </span>
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
                {channel.members?.slice(0, 3).map((m: ChannelMember) => (
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
                onClick={onHuddle}
                disabled={huddleStartPending || huddleJoinPending}
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
              onClick={onToggleFiles}
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
              onClick={onToggleSaved}
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
        )}

        {!isOnline ? (
          <div
            role="status"
            className="shrink-0 px-4 py-1.5 bg-status-warning-surface border-b border-status-warning-rule flex items-center gap-2 text-xs text-status-warning-ink font-medium"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-status-warning-fill animate-pulse shrink-0" />
            You&apos;re offline — messages will be sent when you reconnect
          </div>
        ) : isReconnecting ? (
          <div
            role="status"
            className="shrink-0 px-4 py-1.5 bg-status-info-surface border-b border-status-info-rule flex items-center gap-2 text-xs text-status-info-ink font-medium"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-status-info-fill animate-pulse shrink-0" />
            Reconnecting to live chat…
          </div>
        ) : null}
        <MessagePanelWorkspace
          {...workspace}
          mobileActions={
            isPanelNarrow ? (
              <ChatNarrowThreadActions
                activeHuddle={activeHuddle}
                isInHuddle={isInHuddle}
                onHuddle={onHuddle}
                huddleStartPending={huddleStartPending}
                huddleJoinPending={huddleJoinPending}
                canUseAi={canUseAi}
                summarizeAction={summarizeAction}
                channelId={channelId}
                onToggleFiles={onToggleFiles}
                onToggleSaved={onToggleSaved}
                onToggleInfo={onToggleInfo}
                dropdownTriggerRef={dropdownTriggerRef}
              />
            ) : null
          }
        />
      </div>

      <AnimatePresence>
        {thread.messageId !== null && !isPanelNarrow && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="hidden lg:flex flex-col overflow-hidden shrink-0"
          >
            <ThreadPanel
              channelId={thread.channelId}
              parentMessageId={thread.messageId}
              currentUserId={thread.currentUserId}
              onClose={thread.onClose}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {isPanelNarrow && (
        <Sheet open={isThreadOpen} onOpenChange={handleThreadOpenChange}>
          <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md lg:hidden">
            <SheetTitle className="sr-only">Thread</SheetTitle>
            {thread.messageId !== null && (
              <ThreadPanel
                channelId={thread.channelId}
                parentMessageId={thread.messageId}
                currentUserId={thread.currentUserId}
                onClose={thread.onClose}
              />
            )}
          </SheetContent>
        </Sheet>
      )}

      <MessagePanelSidePanels {...sidePanels} dropdownTriggerRef={dropdownTriggerRef} />
    </div>
  );
}
