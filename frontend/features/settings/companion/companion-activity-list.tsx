"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompanionPromptHistory } from "@/hooks/api/companion";
import { formatDateTime } from "@/lib/date-utils";
import type { CompanionPromptCategory } from "@/hooks/api/companion-schema";

const CATEGORY_LABEL = {
  meeting: "Meeting",
  clockIn: "Clock-in",
  break: "Break",
  friendly: "Check-in",
} as const;
const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABEL);
const STATUS_OPTIONS = [
  "eligible",
  "claimed",
  "dismissed",
  "snoozed",
  "expired",
  "suppressed",
];

export function CompanionActivityList() {
  const [category, setCategory] = useState<CompanionPromptCategory | "all">(
    "all",
  );
  const [status, setStatus] = useState<string>("all");
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useCompanionPromptHistory();

  const items = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (category === "all" || item.category === category) &&
          (status === "all" || item.status === status),
      ),
    [category, items, status],
  );

  const handleLoadMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  function handleCategoryChange(value: string) {
    setCategory(value as CompanionPromptCategory | "all");
  }
  function renderCategoryOption([value, label]: [string, string]) {
    return (
      <SelectItem key={value} value={value}>
        {label}
      </SelectItem>
    );
  }
  function renderStatusOption(value: string) {
    return (
      <SelectItem key={value} value={value}>
        {value.charAt(0).toUpperCase() + value.slice(1)}
      </SelectItem>
    );
  }
  return (
    <div id="companion-activity" className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-foreground">
        Recent suggestions
      </h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="relative flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="companion-category-filter">Category</Label>
          <Select value={category} onValueChange={handleCategoryChange}>
            <SelectTrigger
              id="companion-category-filter"
              aria-label="Filter suggestion category"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORY_OPTIONS.map(renderCategoryOption)}
            </SelectContent>
          </Select>
        </div>
        <div className="relative flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="companion-status-filter">Outcome</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger
              id="companion-status-filter"
              aria-label="Filter suggestion outcome"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All outcomes</SelectItem>
              {STATUS_OPTIONS.map(renderStatusOption)}
            </SelectContent>
          </Select>
        </div>
      </div>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">
          Loading recent suggestions…
        </p>
      ) : null}
      {isError ? (
        <p className="text-xs text-muted-foreground">
          Recent suggestions couldn&apos;t be loaded.
        </p>
      ) : null}
      {data && items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No suggestions yet.</p>
      ) : null}
      {items.length > 0 && filteredItems.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No suggestions match these filters.
        </p>
      ) : null}
      {filteredItems.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {filteredItems.map((item) => (
            <li key={item.id} className="flex flex-col gap-0.5 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">
                  {item.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {CATEGORY_LABEL[item.category]} · {item.status}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {item.status === "suppressed"
                  ? "Suppression reason"
                  : "Why it appeared"}
                : {item.reason}
              </span>
              <span className="text-xs text-muted-foreground">
                Source:{" "}
                {item.sourceRef
                  ? `${item.sourceRef.type} (${item.sourceRef.id})`
                  : "StreamlineOS"}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {formatDateTime(item.eligibleAt)}
              </span>
              {item.href ? (
                <Link
                  href={item.href}
                  className="w-fit text-xs font-medium text-primary underline-offset-2 hover:underline"
                >
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
