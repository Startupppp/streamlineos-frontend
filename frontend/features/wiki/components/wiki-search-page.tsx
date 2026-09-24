"use client";

import { useState, useCallback, useRef, useEffect, useId } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { LayoutList, LayoutGrid, X } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUrlFilters, parseEnum } from "@/lib/url-state/use-url-filters";
import { useKbPageFullSearch } from "@/hooks/api/kb/search";
import { pageHref } from "@/lib/knowledge-routes";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import { SearchSnippetText } from "@/features/wiki/lib/search-snippet-text";
import { TrustBadge, StatusBadge } from "@/features/wiki/components/kb-collection-badges";
import { cn } from "@/lib/utils";
import type { KbPageFullSearchItem } from "@/hooks/api/kb/kb-search-schema";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In review" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;

const VIEW_VALUES = ["list", "card"] as const;
type ViewMode = (typeof VIEW_VALUES)[number];

function SearchSkeleton() {
  return <DataTableSkeleton columns={3} rows={6} />;
}

interface SearchResultRowProps {
  item: KbPageFullSearchItem;
  refCallback: (el: HTMLAnchorElement | null) => void;
  onFocus: () => void;
}

function SearchResultRow({ item, refCallback, onFocus }: SearchResultRowProps) {
  return (
    <Link
      ref={refCallback}
      href={pageHref(item.id)}
      onFocus={onFocus}
      className="flex flex-col gap-1 rounded-md border border-border bg-background px-4 py-3 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-medium text-sm text-foreground">
          {item.title || "Untitled"}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {kbTimeAgo(item.updatedAt)}
        </span>
      </div>
      {item.snippet && (
        <SearchSnippetText
          snippet={item.snippet}
          className="text-xs text-muted-foreground line-clamp-2"
        />
      )}
      <div className="flex items-center gap-1.5 mt-0.5">
        <StatusBadge status={item.status} />
        <TrustBadge trustState={item.trustState} />
      </div>
    </Link>
  );
}

interface SearchResultCardProps {
  item: KbPageFullSearchItem;
  refCallback: (el: HTMLAnchorElement | null) => void;
  onFocus: () => void;
}

function SearchResultCard({ item, refCallback, onFocus }: SearchResultCardProps) {
  return (
    <Link
      ref={refCallback}
      href={pageHref(item.id)}
      onFocus={onFocus}
      className="flex flex-col gap-2 rounded-xl border border-border bg-background p-4 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="font-medium text-sm text-foreground line-clamp-2">
        {item.title || "Untitled"}
      </span>
      {item.snippet && (
        <SearchSnippetText
          snippet={item.snippet}
          className="text-xs text-muted-foreground line-clamp-3"
        />
      )}
      <div className="flex items-center gap-1.5 mt-auto pt-1">
        <StatusBadge status={item.status} />
        <TrustBadge trustState={item.trustState} />
        <span className="ml-auto text-xs text-muted-foreground">
          {kbTimeAgo(item.updatedAt)}
        </span>
      </div>
    </Link>
  );
}

export default function WikiSearchPage() {
  const searchInputId = useId();
  const searchParams = useSearchParams();
  const { update } = useUrlFilters();

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? undefined;
  const view = parseEnum(searchParams.get("view"), VIEW_VALUES, "list");

  const [inputValue, setInputValue] = useState(q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        update({ q: value.trim() || null });
      }, 300);
    },
    [update],
  );

  const { data, isLoading, isError, error, refetch } = useKbPageFullSearch(
    { q, status, facets: true },
    { enabled: q.trim().length > 0 },
  );

  const items = data?.items ?? [];
  const hasFilters = !!status;
  const queryActive = q.trim().length > 0;

  const pageState = usePageState({
    permission: "kb:pages:view",
    isLoading: isLoading && queryActive,
    isError: isError && queryActive,
    error,
    isEmpty: !isLoading && !isError && queryActive && items.length === 0,
  });

  useEffect(() => {
    if (focusedIndex >= 0 && resultRefs.current[focusedIndex]) {
      resultRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex]);

  const handleResultKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (items.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      }
    },
    [items.length],
  );

  const handleClearFilters = useCallback(() => {
    update({ status: null });
  }, [update]);

  const handleClearStatus = useCallback(() => {
    update({ status: null });
  }, [update]);

  const handleStatusChange = useCallback(
    (value: string) => {
      update({ status: value === "all" ? null : value });
    },
    [update],
  );

  const handleViewChange = useCallback(
    (nextView: ViewMode) => {
      update({ view: nextView });
    },
    [update],
  );

  const facetStatusCounts = data?.facets?.status ?? [];

  return (
    <PageWrapper title="Search">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <label htmlFor={searchInputId} className="sr-only">
              Search pages
            </label>
            <Input
              id={searchInputId}
              type="search"
              placeholder="Search pages…"
              value={inputValue}
              onChange={handleInputChange}
              autoFocus
              className="h-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={status ?? "all"}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder="Any status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                {STATUS_OPTIONS.map((opt) => {
                  const facet = facetStatusCounts.find((f) => f.value === opt.value);
                  return (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                      {facet ? ` (${facet.count})` : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <div className="flex rounded-md border border-border">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="List view"
                aria-pressed={view === "list"}
                className={cn(
                  "h-9 w-9 rounded-r-none",
                  view === "list" && "bg-muted",
                )}
                onClick={() => handleViewChange("list")}
              >
                <LayoutList className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Card view"
                aria-pressed={view === "card"}
                className={cn(
                  "h-9 w-9 rounded-l-none border-l",
                  view === "card" && "bg-muted",
                )}
                onClick={() => handleViewChange("card")}
              >
                <LayoutGrid className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {queryActive && !isLoading && items.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              {data?.hasMore
                ? `Top ${items.length} results`
                : `${items.length} result${items.length !== 1 ? "s" : ""}`}
            </span>
            {status && (
              <button
                type="button"
                onClick={handleClearStatus}
                className="flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-xs hover:bg-muted/80"
                aria-label={`Remove status filter: ${status}`}
              >
                {status}
                <X className="size-3" />
              </button>
            )}
          </div>
        )}

        <PageState
          resolution={pageState}
          loading={<SearchSkeleton />}
          empty={
            <EmptyState
              title={queryActive ? "No results" : "Search pages"}
              description={
                queryActive
                  ? "Try a different query or clear your filters."
                  : "Enter a query above to find pages."
              }
              filtersActive={queryActive && hasFilters}
              filteredTitle="No pages match your filters"
              onClearFilters={handleClearFilters}
            />
          }
          onRetry={refetch}
        >
          {!queryActive ? (
            <EmptyState
              title="Search pages"
              description="Enter a query above to find pages across the knowledge base."
            />
          ) : (
            <div
              className={cn(
                "flex flex-col gap-2",
                view === "card" && "sm:grid sm:grid-cols-2 lg:grid-cols-3",
              )}
              onKeyDown={handleResultKeyDown}
            >
              {items.map((item, index) =>
                view === "card" ? (
                  <SearchResultCard
                    key={item.id}
                    item={item}
                    refCallback={(el) => {
                      resultRefs.current[index] = el;
                    }}
                    onFocus={() => setFocusedIndex(index)}
                  />
                ) : (
                  <SearchResultRow
                    key={item.id}
                    item={item}
                    refCallback={(el) => {
                      resultRefs.current[index] = el;
                    }}
                    onFocus={() => setFocusedIndex(index)}
                  />
                ),
              )}
            </div>
          )}
        </PageState>
      </div>
    </PageWrapper>
  );
}
