"use client";

import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlusIcon } from "@animateicons/react/lucide";
import { MessageSquareText, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatInboxFilters } from "./chat-inbox-filters";
import {
  formatInboxSummary,
  type ChatInboxFilter,
  type ChatInboxFilterCounts,
} from "./chat-inbox-filter";

interface ChannelSidebarHeaderProps {
  isCollapsed: boolean;
  onlineUserCount: number;
  unreadTotal: number;
  showArchived: boolean;
  inboxFilter: ChatInboxFilter;
  inboxCounts: ChatInboxFilterCounts;
  onInboxFilter: (filter: ChatInboxFilter) => void;
  onOpenNewDM: () => void;
  onOpenNewChannel: () => void;
  onOpenSearch: () => void;
}

export function ChannelSidebarHeader({
  isCollapsed,
  onlineUserCount,
  unreadTotal,
  showArchived,
  inboxFilter,
  inboxCounts,
  onInboxFilter,
  onOpenNewDM,
  onOpenNewChannel,
  onOpenSearch,
}: ChannelSidebarHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 px-3 pt-2 pb-2 sm:px-4",
        isCollapsed && "lg:hidden",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary shadow-sm">
            <MessageSquareText className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold leading-tight">Messages</h2>
            <p className="text-dense leading-tight text-muted-foreground">
              {formatInboxSummary(unreadTotal, onlineUserCount)}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <AnimatedIconButton icon={PlusIcon} iconSize={16} size="sm">
              New
            </AnimatedIconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onSelect={onOpenNewDM}>New message</DropdownMenuItem>
            <DropdownMenuItem onSelect={onOpenNewChannel}>New channel</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <button
        type="button"
        onClick={onOpenSearch}
        aria-label="Search messages, channels and people"
        className="flex h-9 w-full items-center gap-2 rounded-lg border border-border/30 bg-muted/30 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-left">
          Search messages, channels, people
        </span>
      </button>

      {!showArchived && (
        <ChatInboxFilters
          value={inboxFilter}
          counts={inboxCounts}
          onChange={onInboxFilter}
        />
      )}
    </div>
  );
}
