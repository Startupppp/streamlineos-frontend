"use client";

import type { RefObject } from "react";
import { InfoIcon, MicIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { cn } from "@/lib/utils";
import type { AiAction } from "@/components/ai";
import type { Huddle } from "@/types/chat";
import { ConversationOverflowMenu } from "./message-panel-actions";

interface ChatNarrowThreadActionsProps {
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
  dropdownTriggerRef: RefObject<HTMLButtonElement | null>;
}

const NARROW_ACTION_CLASS = "h-11 min-w-11 flex-1 flex-col gap-0.5 text-dense";

export function ChatNarrowThreadActions({
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
          type="button"
          icon={MicIcon}
          iconSize={18}
          variant="ghost"
          className={cn(NARROW_ACTION_CLASS, activeHuddle && "text-status-success-ink")}
          onClick={onHuddle}
          disabled={huddleStartPending || huddleJoinPending}
          aria-label={activeHuddle ? "Join huddle" : "Start huddle"}
        >
          {activeHuddle ? "Join" : "Huddle"}
        </AnimatedIconButton>
      )}
      <AnimatedIconButton
        type="button"
        icon={InfoIcon}
        iconSize={18}
        variant="ghost"
        className={NARROW_ACTION_CLASS}
        onClick={onToggleInfo}
        aria-label="Conversation details"
        aria-expanded={showInfoPanel}
      >
        Details
      </AnimatedIconButton>
      <ConversationOverflowMenu
        canUseAi={canUseAi}
        summarizeAction={summarizeAction}
        onOpenSaved={onToggleSaved}
        triggerClassName={NARROW_ACTION_CLASS}
        triggerRef={dropdownTriggerRef}
      >
        More
      </ConversationOverflowMenu>
    </div>
  );
}
