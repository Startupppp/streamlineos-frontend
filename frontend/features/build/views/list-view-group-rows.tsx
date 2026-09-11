"use client";

import { useCallback, useState } from "react";
import { LIST_RENDER_PAGE_SIZE } from "./list-view-shared";
import { ListViewItem } from "./list-view-item";
import type { ListViewItemProps, Ticket } from "./list-view-shared";

interface GroupRenderLimit {
  visibleCount: number;
  hiddenCount: number;
  showMore: () => void;
}

/**
 * The flat list path has always capped its render at LIST_RENDER_PAGE_SIZE; the
 * grouped paths did not, so switching on `groupBy` silently mounted every
 * autoloaded ticket at once. Each group now carries the same cap.
 */
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
    <button
      type="button"
      onClick={onShowMore}
      className="mx-auto mt-1.5 block rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
    >
      Show {Math.min(LIST_RENDER_PAGE_SIZE, total - visibleCount)} more
      <span className="ml-1 tabular-nums opacity-70">
        ({visibleCount} of {total})
      </span>
    </button>
  );
}

export interface GroupRowsProps {
  items: Ticket[];
  projectKey: ListViewItemProps["projectKey"];
  projectId: ListViewItemProps["projectId"];
  projectStatuses: ListViewItemProps["projectStatuses"];
  displayOptions: ListViewItemProps["displayOptions"];
  onTicketClick: ListViewItemProps["onClick"];
}

export function GroupRows({
  items,
  projectKey,
  projectId,
  projectStatuses,
  displayOptions,
  onTicketClick,
}: GroupRowsProps) {
  const { visibleCount, hiddenCount, showMore } = useGroupRenderLimit(
    items.length,
  );

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
