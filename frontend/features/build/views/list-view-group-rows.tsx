"use client";

import { useCallback, useState } from "react";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import {
  LIST_RENDER_PAGE_SIZE,
  useItemSelectHandler,
} from "./list-view-shared";
import { ListViewItem } from "./list-view-item";
import type {
  ListSelection,
  ListViewItemProps,
  Ticket,
} from "./list-view-shared";

interface GroupRenderLimit {
  visibleCount: number;
  hiddenCount: number;
  showMore: () => void;
}

export function useGroupRenderLimit(total: number): GroupRenderLimit {
  const [visibleCount, setVisibleCount] = useState(LIST_RENDER_PAGE_SIZE);
  const showMore = useCallback(
    () => setVisibleCount((count) => count + LIST_RENDER_PAGE_SIZE),
    [],
  );
  return {
    visibleCount,
    hiddenCount: Math.max(0, total - visibleCount),
    showMore,
  };
}

export function ShowMoreRowsButton({
  visibleCount,
  total,
  onShowMore,
}: {
  visibleCount: number;
  total: number;
  onShowMore: () => void;
}) {
  return (
    <InfiniteScrollSentinel
      hasNextPage={visibleCount < total}
      isFetchingNextPage={false}
      onLoadMore={onShowMore}
      label={`Show ${Math.min(LIST_RENDER_PAGE_SIZE, total - visibleCount)} more rows`}
    />
  );
}

export interface GroupRowsProps {
  items: Ticket[];
  projectKey: ListViewItemProps["projectKey"];
  projectId: ListViewItemProps["projectId"];
  projectStatuses: ListViewItemProps["projectStatuses"];
  displayOptions: ListViewItemProps["displayOptions"];
  onTicketClick: ListViewItemProps["onClick"];
  selection?: ListSelection;
  focusedTicketId?: number | null;
}

export function GroupRows({
  items,
  projectKey,
  projectId,
  projectStatuses,
  displayOptions,
  onTicketClick,
  selection,
  focusedTicketId,
}: GroupRowsProps) {
  const { visibleCount, hiddenCount, showMore } = useGroupRenderLimit(
    items.length,
  );

  const handleItemSelect = useItemSelectHandler(selection);

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm divide-y divide-border">
        {items.slice(0, visibleCount).map((ticket) => (
          <ListViewItem
            key={ticket.id}
            ticket={ticket}
            projectKey={projectKey}
            projectId={projectId}
            projectStatuses={projectStatuses}
            onClick={onTicketClick}
            displayOptions={displayOptions}
            isSelected={selection?.selected.has(ticket.id)}
            onSelect={selection ? handleItemSelect : undefined}
            isKeyboardFocused={focusedTicketId === ticket.id}
          />
        ))}
      </div>
      {hiddenCount > 0 && (
        <ShowMoreRowsButton
          visibleCount={visibleCount}
          total={items.length}
          onShowMore={showMore}
        />
      )}
    </>
  );
}
