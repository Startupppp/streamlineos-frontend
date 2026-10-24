"use client";

import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MobileOnlyLabelTooltip,
  RESPONSIVE_ICON_LABEL_TRIGGER_CLASS,
  ResponsiveIconLabelText,
} from "@/components/ui/responsive-icon-label";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@animateicons/react/lucide";
import { Archive, MessageSquareText, Search } from "lucide-react";
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
  showArchivedEntry: boolean;
  archivedUnreadCount: number;
  inboxFilter: ChatInboxFilter;
  inboxCounts: ChatInboxFilterCounts;
  onInboxFilter: (filter: ChatInboxFilter) => void;
  onOpenArchived: () => void;
  onOpenNewDM: () => void;
  onOpenNewChannel: () => void;
  onOpenSearch: () => void;
}

export function ChannelSidebarHeader({
  isCollapsed,
  onlineUserCount,
  unreadTotal,
  showArchived,
  showArchivedEntry,
  archivedUnreadCount,
  inboxFilter,
  inboxCounts,
  onInboxFilter,
  onOpenArchived,
  onOpenNewDM,
  onOpenNewChannel,
  onOpenSearch,
}: ChannelSidebarHeaderProps) {
  const archivedLabel =
    archivedUnreadCount > 0
      ? `Archived, ${archivedUnreadCount > 99 ? "99+" : archivedUnreadCount} unread`
      : "Archived";

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
            <AnimatedIconButton icon={PlusIcon} iconSize={16} size="sm" data-chat-opener="new">
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
        data-chat-opener="search"
        aria-label="Search messages, channels and people"
        className="flex h-9 w-full items-center gap-2 rounded-lg border border-border/30 bg-muted/30 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-left">
          Search messages, channels, people
        </span>
      </button>

      {!showArchived && (
        <div className="flex min-w-0 w-full flex-nowrap items-center gap-2">
          <ChatInboxFilters
            value={inboxFilter}
            counts={inboxCounts}
            onChange={onInboxFilter}
            className="min-w-0 flex-1"
          />
          {showArchivedEntry ? (
            <MobileOnlyLabelTooltip label={archivedLabel}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenArchived}
                aria-label={archivedLabel}
                className={cn(
                  RESPONSIVE_ICON_LABEL_TRIGGER_CLASS,
                  "bg-card",
                  archivedUnreadCount > 0 && "w-auto px-2 md:px-2.5",
                )}
              >
                <Archive className="size-4 shrink-0" aria-hidden="true" />
                <ResponsiveIconLabelText>Archived</ResponsiveIconLabelText>
                {archivedUnreadCount > 0 ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 font-mono text-micro font-bold tabular-nums text-primary-foreground">
                    {archivedUnreadCount > 99 ? "99+" : archivedUnreadCount}
                  </span>
                ) : null}
              </Button>
            </MobileOnlyLabelTooltip>
          ) : null}
        </div>
      )}
    </div>
  );
}
