"use client";

import type { RefObject } from "react";
import { MicIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { cn } from "@/lib/utils";
import type { AiAction } from "@/components/ai";
import type { Huddle } from "@/types/chat";
import { ConversationOverflowMenu } from "./message-panel-actions";
import { HuddleAccountPicker } from "./huddle-account-picker";

interface ChatNarrowThreadActionsProps {
  activeHuddle: Huddle | null | undefined;
  isInHuddle: boolean;
  onHuddle: (connectionId?: number) => void;
  huddleStartPending: boolean;
  huddleJoinPending: boolean;
  canUseAi: boolean;
  summarizeAction: AiAction;
  onToggleSaved: () => void;
  onToggleInfo: () => void;
  showInfoPanel: boolean;
  dropdownTriggerRef: RefObject<HTMLButtonElement | null>;
}

const NARROW_ICON_CLASS = "size-9 shrink-0 rounded-lg p-0 text-muted-foreground hover:text-foreground";

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
      className="flex shrink-0 items-center gap-0.5"
    >
      {!isInHuddle && activeHuddle && (
        <AnimatedIconButton
          type="button"
          icon={MicIcon}
          iconSize={16}
          iconClassName="mr-0"
          variant="ghost"
          size="icon"
          className={cn(NARROW_ICON_CLASS, "text-status-success-ink hover:text-status-success-ink")}
          onClick={() => onHuddle()}
          disabled={huddleJoinPending}
          aria-label="Join huddle"
        />
      )}
      {!isInHuddle && !activeHuddle && (
        <HuddleAccountPicker
          onStart={onHuddle}
          disabled={huddleStartPending}
          className={NARROW_ICON_CLASS}
          iconSize={16}
        />
      )}
      <ConversationOverflowMenu
        canUseAi={canUseAi}
        summarizeAction={summarizeAction}
        onOpenSaved={onToggleSaved}
        onOpenDetails={onToggleInfo}
        detailsOpen={showInfoPanel}
        triggerClassName={NARROW_ICON_CLASS}
        triggerRef={dropdownTriggerRef}
      />
    </div>
  );
}
