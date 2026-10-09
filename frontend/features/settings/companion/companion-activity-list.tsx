"use client";

import { useCallback, useMemo } from "react";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { useCompanionPromptHistory } from "@/hooks/api/companion";
import { formatDateTime } from "@/lib/date-utils";

const CATEGORY_LABEL = {
  meeting: "Meeting",
  clockIn: "Clock-in",
  break: "Break",
  friendly: "Check-in",
} as const;

export function CompanionActivityList() {
  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } = useCompanionPromptHistory();
  const items = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
  const handleLoadMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);
  return (
    <div id="companion-activity" className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-foreground">Recent suggestions</h3>
      {isLoading ? <p className="text-xs text-muted-foreground">Loading recent suggestions…</p> : null}
      {isError ? <p className="text-xs text-muted-foreground">Recent suggestions couldn&apos;t be loaded.</p> : null}
      {data && items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No suggestions yet.</p>
      ) : null}
      {items.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-0.5 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{item.title}</span>
                <span className="text-xs text-muted-foreground">
                  {CATEGORY_LABEL[item.category]} · {item.status}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{item.reason}</span>
              <span className="text-xs tabular-nums text-muted-foreground">{formatDateTime(item.eligibleAt)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {items.length > 0 ? (
        <InfiniteScrollSentinel
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={handleLoadMore}
          label="Load more suggestions"
        />
      ) : null}
    </div>
  );
}
