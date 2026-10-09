"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { useCompanionPromptHistory } from "@/hooks/api/companion";
import { formatDateTime } from "@/lib/date-utils";
import type { CompanionPromptCategory } from "@/hooks/api/companion-schema";
import { FIELD_CONTROL_CLASS } from "@/components/ui/field-control";

const CATEGORY_LABEL = {
  meeting: "Meeting",
  clockIn: "Clock-in",
  break: "Break",
  friendly: "Check-in",
} as const;

export function CompanionActivityList() {
  const [category, setCategory] = useState<CompanionPromptCategory | "all">("all");
  const [status, setStatus] = useState<string>("all");
  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } = useCompanionPromptHistory();
  const items = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
  const filteredItems = useMemo(
    () => items.filter((item) =>
      (category === "all" || item.category === category) &&
      (status === "all" || item.status === status),
    ),
    [category, items, status],
  );
  const handleLoadMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);
  return (
    <div id="companion-activity" className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-foreground">Recent suggestions</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Category
          <select
            aria-label="Filter suggestion category"
            className={FIELD_CONTROL_CLASS}
            value={category}
            onChange={(event) => setCategory(event.target.value as CompanionPromptCategory | "all")}
          >
            <option value="all">All categories</option>
            {Object.entries(CATEGORY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Outcome
          <select
            aria-label="Filter suggestion outcome"
            className={FIELD_CONTROL_CLASS}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All outcomes</option>
            {['eligible', 'claimed', 'dismissed', 'snoozed', 'expired', 'suppressed'].map((value) => (
              <option key={value} value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</option>
            ))}
          </select>
        </label>
      </div>
      {isLoading ? <p className="text-xs text-muted-foreground">Loading recent suggestions…</p> : null}
      {isError ? <p className="text-xs text-muted-foreground">Recent suggestions couldn&apos;t be loaded.</p> : null}
      {data && items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No suggestions yet.</p>
      ) : null}
      {items.length > 0 && filteredItems.length === 0 ? (
        <p className="text-xs text-muted-foreground">No suggestions match these filters.</p>
      ) : null}
      {filteredItems.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {filteredItems.map((item) => (
            <li key={item.id} className="flex flex-col gap-0.5 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{item.title}</span>
                <span className="text-xs text-muted-foreground">
                  {CATEGORY_LABEL[item.category]} · {item.status}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {item.status === "suppressed" ? "Suppression reason" : "Why it appeared"}: {item.reason}
              </span>
              <span className="text-xs text-muted-foreground">
                Source: {item.sourceRef ? `${item.sourceRef.type} (${item.sourceRef.id})` : "StreamlineOS"}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">{formatDateTime(item.eligibleAt)}</span>
              {item.href ? (
                <Link href={item.href} className="w-fit text-xs font-medium text-primary underline-offset-2 hover:underline">
                  Open destination
                </Link>
              ) : null}
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
