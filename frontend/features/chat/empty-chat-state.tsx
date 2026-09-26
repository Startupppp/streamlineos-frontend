"use client";

import { PlusIcon, SearchIcon, UsersIcon } from "@animateicons/react/lucide";
import { ChatIllustration } from "@/components/illustrations";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ChannelSidebarCollapseButton } from "./channel-sidebar-collapse-button";

const PANE_ACTION_CLASS = "h-11 flex-col gap-1 px-2";

export function EmptyChatState({
  onNewDM,
  onNewChannel,
  onSearch,
  isSidebarCollapsed,
  onToggleSidebar,
}: {
  onNewDM: () => void;
  onNewChannel: () => void;
  onSearch: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {onToggleSidebar && (
        <div className="flex h-14 shrink-0 items-center border-b border-border/40 px-4">
          <ChannelSidebarCollapseButton
            isCollapsed={isSidebarCollapsed ?? false}
            onToggle={onToggleSidebar}
          />
        </div>
      )}
      <EmptyState
        illustration={<ChatIllustration className="h-44 w-44" />}
        title="Choose a conversation"
        description="Your messages and channels are in the list. Start a new one when you need it."
        className="min-h-0 flex-1 border-0 bg-transparent px-6 shadow-none"
      />
      <div className="grid shrink-0 grid-cols-3 gap-2 border-t border-border/40 bg-background/95 p-3">
        <AnimatedIconButton
          icon={PlusIcon}
          iconSize={18}
          variant="outline"
          className={PANE_ACTION_CLASS}
          onClick={onNewDM}
        >
          Message
        </AnimatedIconButton>
        <AnimatedIconButton
          icon={UsersIcon}
          iconSize={18}
          variant="outline"
          className={PANE_ACTION_CLASS}
          onClick={onNewChannel}
        >
          Channel
        </AnimatedIconButton>
        <AnimatedIconButton
          icon={SearchIcon}
          iconSize={18}
          variant="outline"
          className={PANE_ACTION_CLASS}
          onClick={onSearch}
        >
          Search
        </AnimatedIconButton>
      </div>
    </div>
  );
}
