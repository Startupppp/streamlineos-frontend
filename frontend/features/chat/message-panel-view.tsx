"use client";

import React from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, Search } from "lucide-react";
import { InfoIcon, MicIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { AiAction } from "@/components/ai";
import { useIsChatPanelNarrow } from "./use-chat-mobile";
import { ChannelAvatar } from "./channel-avatar";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import type { HuddlePanel as HuddlePanelType } from "./huddle-panel";
import { ChatNarrowThreadActions } from "./chat-narrow-thread-actions";
import { MessagePanelSidePanels } from "./message-panel-side-panels";
import { MessagePanelThread } from "./message-panel-thread";
import { ConversationOverflowMenu } from "./message-panel-actions";
import { ChatPanelFallback } from "./chat-lazy-fallbacks";
import type { ChannelMember, Huddle } from "@/types/chat";
import type { ChatChannelDetailWire } from "@/hooks/api/chat-extra-schema";
import { getInitials } from "@/lib/format-utils";
import { huddleProviderPresentation } from "./huddle-provider";

const HuddlePanel = dynamic(
  () => import("./huddle-panel").then((m) => ({ default: m.HuddlePanel })),
  { ssr: false, loading: () => <ChatPanelFallback label="Loading huddle" /> },
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
  onToggleSaved: () => void;
  onToggleInfo: () => void;
  showInfoPanel: boolean;
}

interface WorkspaceProps {
  messageList: React.ComponentProps<typeof MessageList>;
  messageInput: React.ComponentProps<typeof MessageInput>;
  huddle?: React.ComponentProps<typeof HuddlePanelType>;
}

interface MessagePanelViewProps {
  header: PanelHeaderProps;
  workspace: WorkspaceProps;
  thread: React.ComponentProps<typeof MessagePanelThread>["thread"];
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
    onToggleSaved,
    onToggleInfo,
    showInfoPanel,
  } = header;
  const isPanelNarrow = useIsChatPanelNarrow();
  const searchButton = (
    <button
      type="button"
      aria-label="Search messages, channels and people"
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() =>
        window.dispatchEvent(new CustomEvent("chat:open-search"))
      }
    >
      <Search className="size-4" aria-hidden />
    </button>
  );
  const dropdownTriggerRef = React.useRef<HTMLButtonElement>(null);
  function handleSkipToComposer(event: React.MouseEvent<HTMLButtonElement>) {
    event.currentTarget.parentElement?.querySelector<HTMLElement>("[data-chat-composer]")?.focus();
  }

  return (
    <div className="flex flex-1 min-w-0 overflow-hidden">
      <div className="relative flex flex-col flex-1 min-w-0 overflow-hidden">
        {workspace.messageList.joinRequired ? null : (
          <button
            type="button"
            onClick={handleSkipToComposer}
            className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-30 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md focus:ring-2 focus:ring-ring focus:outline-none"
          >
            Skip to message composer
          </button>
        )}
        {isPanelNarrow && (
          <div className="flex min-h-14 shrink-0 items-center gap-1.5 border-b border-border/40 bg-card/80 px-2">
            <button
              type="button"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={onBack}
              aria-label="Back to conversations"
            >
              <ArrowLeft className="size-5" aria-hidden />
            </button>
            <div className="min-w-0 flex-1">
              <TruncatedText
                text={displayName}
                className="text-sm font-semibold"
              />
            </div>
            <ChatNarrowThreadActions
              activeHuddle={activeHuddle}
              isInHuddle={isInHuddle}
              onHuddle={onHuddle}
              huddleStartPending={huddleStartPending}
              huddleJoinPending={huddleJoinPending}
              canUseAi={canUseAi}
              summarizeAction={summarizeAction}
              onToggleSaved={onToggleSaved}
              onToggleInfo={onToggleInfo}
              showInfoPanel={showInfoPanel}
              dropdownTriggerRef={dropdownTriggerRef}
            />
            {searchButton}
          </div>
        )}
        {!isPanelNarrow && (
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border/40 bg-card/80 px-4 sticky top-0 z-20">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
            aria-label="Back to channels"
          >
            <ArrowLeft className="size-5" />
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
          {searchButton}
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
                aria-label={
                  activeHuddle
                    ? `${huddleProviderPresentation(activeHuddle.meetingProvider).joinLabel}, ${activeHuddle.participants.length} joined through StreamlineOS`
                    : "Start huddle"
                }
              >
                {activeHuddle ? (
                  <span>
                    {huddleProviderPresentation(activeHuddle.meetingProvider).joinLabel} ({activeHuddle.participants.length})
                  </span>
                ) : (
                  <span>Huddle</span>
                )}
              </AnimatedIconButton>
            )}
            <AnimatedIconButton
              type="button"
              icon={InfoIcon}
              iconSize={16}
              variant="ghost"
              size="icon"
              className={cn("size-8 rounded-lg", showInfoPanel && "bg-muted")}
              onClick={onToggleInfo}
              aria-label="Conversation details"
              aria-expanded={showInfoPanel}
            />
            <ConversationOverflowMenu
              canUseAi={canUseAi}
              summarizeAction={summarizeAction}
              onOpenSaved={onToggleSaved}
              triggerClassName="size-8 rounded-lg p-0 text-muted-foreground hover:text-foreground"
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
        <MessageList {...workspace.messageList} />
        {workspace.messageList.joinRequired ? null : <MessageInput {...workspace.messageInput} />}
        {workspace.huddle ? <HuddlePanel {...workspace.huddle} /> : null}
      </div>

      <MessagePanelThread thread={thread} isPanelNarrow={isPanelNarrow} />

      <MessagePanelSidePanels {...sidePanels} dropdownTriggerRef={dropdownTriggerRef} />
    </div>
  );
}
