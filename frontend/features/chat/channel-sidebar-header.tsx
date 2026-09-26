"use client";

import React, { useCallback, useRef, useState } from "react";
import { SearchInput } from "@/components/ui/search-input";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDownIcon, ChevronUpIcon, PlusIcon } from "@animateicons/react/lucide";
import { MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatInboxFilters } from "./chat-inbox-filters";
import { ChannelSidebarSearchScopes } from "./channel-sidebar-search-scopes";
import {
  formatInboxSummary,
  type ChatInboxFilter,
  type ChatInboxFilterCounts,
} from "./chat-inbox-filter";
import type { ChatSearchScope } from "./chat-search-scope";

interface ChannelSidebarHeaderProps {
  isCollapsed: boolean;
  onlineUserCount: number;
  unreadTotal: number;
  search: string;
  showArchived: boolean;
  inboxFilter: ChatInboxFilter;
  inboxCounts: ChatInboxFilterCounts;
  searchScope: ChatSearchScope;
  onInboxFilter: (filter: ChatInboxFilter) => void;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onSearchScopeChange: (scope: ChatSearchScope) => void;
  onSearchFocusChange: (focused: boolean) => void;
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
  searchScope,
  onInboxFilter,
  onSearchChange,
  onClearSearch,
  onSearchScopeChange,
  onSearchFocusChange,
  onOpenNewDM,
  onOpenNewGroup,
  searchInputRef,
}: ChannelSidebarHeaderProps) {
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchGroupRef = useRef<HTMLDivElement>(null);

  const handleToggleHeader = useCallback(() => {
    setHeaderCollapsed((prev) => !prev);
  }, []);

  const handleSearchFocus = useCallback(() => {
    setSearchFocused(true);
    onSearchFocusChange(true);
  }, [onSearchFocusChange]);

  const handleSearchGroupBlur = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      const next = event.relatedTarget;
      if (next instanceof Node && searchGroupRef.current?.contains(next)) return;
      setSearchFocused(false);
      onSearchFocusChange(false);
    },
    [onSearchFocusChange],
  );

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
        <div className="flex shrink-0 items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <AnimatedIconButton icon={PlusIcon} iconSize={16} size="sm">
                New
              </AnimatedIconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={onOpenNewDM}>New message</DropdownMenuItem>
              <DropdownMenuItem onSelect={onOpenNewGroup}>New channel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={handleToggleHeader}
            aria-label={headerCollapsed ? "Expand header" : "Collapse header"}
            aria-expanded={!headerCollapsed}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {headerCollapsed ? (
              <ChevronDownIcon size={16} aria-hidden="true" />
            ) : (
              <ChevronUpIcon size={16} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {!headerCollapsed && (
        <>
          <div
            ref={searchGroupRef}
            className="flex flex-col gap-2"
            onBlur={handleSearchGroupBlur}
          >
            <SearchInput
              ref={searchInputRef}
              fill
              placeholder={
                showArchived ? "Search archived chats..." : "Search conversations..."
              }
              value={search}
              onValueChange={onSearchChange}
              onClear={onClearSearch}
              onFocus={handleSearchFocus}
              aria-label={
                showArchived ? "Search archived chats" : "Search conversations"
              }
              inputClassName="rounded-lg border-border/30 bg-muted/30 placeholder:text-muted-foreground"
            />
            {searchFocused && !showArchived && (
              <ChannelSidebarSearchScopes
                value={searchScope}
                onChange={onSearchScopeChange}
              />
            )}
          </div>

          {!showArchived && (
            <ChatInboxFilters
              value={inboxFilter}
              counts={inboxCounts}
              onChange={onInboxFilter}
            />
          )}
        </>
      )}
    </div>
  );
}
