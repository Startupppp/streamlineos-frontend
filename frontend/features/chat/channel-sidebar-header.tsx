"use client";

import React from "react";
import { SearchInput } from "@/components/ui/search-input";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlusIcon, SearchIcon } from "@animateicons/react/lucide";
import { MessageSquareText } from "lucide-react";
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
  search: string;
  showArchived: boolean;
  inboxFilter: ChatInboxFilter;
  inboxCounts: ChatInboxFilterCounts;
  onInboxFilter: (filter: ChatInboxFilter) => void;
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
  unreadTotal,
  search,
  showArchived,
  inboxFilter,
  inboxCounts,
  onInboxFilter,
  onSearchChange,
  onClearSearch,
  onOpenChatSearch,
  onOpenBrowse,
  onOpenNewDM,
  onOpenNewGroup,
  searchInputRef,
}: ChannelSidebarHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-2 px-3 pt-2 pb-2 sm:px-4", isCollapsed && "lg:hidden")}>
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
        <div className="hidden items-center gap-1 lg:flex">
          <AnimatedIconButton
            icon={SearchIcon}
            iconSize={16}
            variant="ghost"
            size="icon"
            onClick={onOpenChatSearch}
            aria-label="Search messages"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <AnimatedIconButton icon={PlusIcon} iconSize={16} size="sm">
                New
              </AnimatedIconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={onOpenNewDM}>New message</DropdownMenuItem>
              <DropdownMenuItem onSelect={onOpenNewGroup}>New channel</DropdownMenuItem>
              <DropdownMenuItem onSelect={onOpenBrowse}>Browse channels</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <SearchInput
        ref={searchInputRef}
        fill
        placeholder={showArchived ? "Search archived chats..." : "Search conversations..."}
        value={search}
        onValueChange={onSearchChange}
        onClear={onClearSearch}
        aria-label={showArchived ? "Search archived chats" : "Search conversations"}
        inputClassName="rounded-lg border-border/30 bg-muted/30 placeholder:text-muted-foreground"
      />

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
