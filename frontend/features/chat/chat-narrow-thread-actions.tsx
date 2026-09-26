"use client";

import { EllipsisIcon, MicIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { AiAction } from "@/components/ai";
import dynamic from "next/dynamic";
import type { RefObject } from "react";
import { ChatTriggerFallback } from "./chat-lazy-fallbacks";
import type { Huddle } from "@/types/chat";

const AiActionsMenu = dynamic(
  () => import("@/components/ai").then((m) => ({ default: m.AiActionsMenu })),
  {
    ssr: false,
    loading: () => <ChatTriggerFallback label="Loading AI actions" />,
  },
);

interface ChatNarrowThreadActionsProps {
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
  onToggleInfo: () => void;
  dropdownTriggerRef: RefObject<HTMLButtonElement | null>;
}

export function ChatNarrowThreadActions({
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
  onToggleInfo,
  dropdownTriggerRef,
}: ChatNarrowThreadActionsProps) {
  return (
    <div
      role="toolbar"
      aria-label="Conversation actions"
      className="flex shrink-0 items-stretch gap-1 border-t border-border/40 bg-background px-2 py-1"
    >
      {!isInHuddle && (
        <AnimatedIconButton
          icon={MicIcon}
          iconSize={18}
          variant="ghost"
          className={cn(
            "h-11 min-w-11 flex-1 flex-col gap-0.5 text-dense",
            activeHuddle && "text-status-success-ink",
          )}
          onClick={onHuddle}
          disabled={huddleStartPending || huddleJoinPending}
          aria-label={activeHuddle ? "Join huddle" : "Start huddle"}
        >
          {activeHuddle ? "Join" : "Huddle"}
        </AnimatedIconButton>
      )}
      {canUseAi && (
        <AiActionsMenu
          actions={[summarizeAction]}
          align="end"
          disabled={!channelId}
          triggerLabel="AI"
          className="h-11 min-w-11 flex-1 px-2 text-dense"
        />
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <AnimatedIconButton
            ref={dropdownTriggerRef}
            icon={EllipsisIcon}
            iconSize={18}
            variant="ghost"
            className="h-11 min-w-11 flex-1 flex-col gap-0.5 text-dense"
            aria-label="More conversation actions"
          >
            More
          </AnimatedIconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={onToggleFiles}>Shared files</DropdownMenuItem>
          <DropdownMenuItem onSelect={onToggleSaved}>Saved messages</DropdownMenuItem>
          <DropdownMenuItem onSelect={onToggleInfo}>Member details</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
