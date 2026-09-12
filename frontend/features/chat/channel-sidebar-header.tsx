"use client";

import React from "react";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { SearchInput } from "@/components/ui/search-input";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  CompassIcon,
  PlusIcon,
  SearchIcon,
  UsersIcon,
} from "@animateicons/react/lucide";
import { MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";

const RAIL_ICON_SIZE = 14;

const SidebarSearchButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function SidebarSearchButton({ className, ...props }, ref) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button ref={ref} {...hoverHandlers} className={className} {...props}>
      <SearchIcon ref={iconRef} size={RAIL_ICON_SIZE} />
    </button>
  );
});

interface ChannelSidebarHeaderProps {
  isCollapsed: boolean;
  onlineUserCount: number;
  search: string;
  showArchived: boolean;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onOpenChatSearch: () => void;
  onOpenBrowse: () => void;
  onOpenNewDM: () => void;
  onOpenNewGroup: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export function ChannelSidebarHeader({
  isCollapsed,
  onlineUserCount,
  search,
  showArchived,
  onSearchChange,
  onClearSearch,
  onOpenChatSearch,
  onOpenBrowse,
  onOpenNewDM,
  onOpenNewGroup,
  searchInputRef,
}: ChannelSidebarHeaderProps) {
  return (
    <div className={cn("px-4 pt-3 pb-2", isCollapsed && "md:hidden")}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <MessageSquareText className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold leading-tight">Messages</h2>
            <p className="text-dense text-muted-foreground leading-tight">
              {onlineUserCount} online
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-0.5 sm:flex">
          <SidebarSearchButton
            type="button"
            onClick={onOpenChatSearch}
            className="w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Search"
            title="Search"
          />
          <button
            type="button"
            onClick={onOpenBrowse}
            className="w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Browse public channels"
            title="Browse Channels"
          >
            <CompassIcon size={RAIL_ICON_SIZE} />
          </button>
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={RAIL_ICON_SIZE}
            variant="ghost"
            size="icon"
            className="w-7 rounded-lg"
            onClick={onOpenNewDM}
            title="New Direct Message"
            aria-label="New Direct Message"
          />
          <AnimatedIconButton
            icon={UsersIcon}
            iconSize={RAIL_ICON_SIZE}
            variant="ghost"
            size="icon"
            className="w-7 rounded-lg"
            onClick={onOpenNewGroup}
            title="New Channel"
            aria-label="New Channel"
          />
        </div>
      </div>

      <SearchInput
        ref={searchInputRef}
        placeholder={showArchived ? "Search archived chats..." : "Search conversations..."}
        value={search}
        onValueChange={onSearchChange}
        onClear={onClearSearch}
        inputClassName="bg-muted/30 border-border/30 rounded-lg placeholder:text-muted-foreground"
      />
    </div>
  );
}
