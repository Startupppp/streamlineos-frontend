"use client";

import { useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutList, LayoutGrid } from "lucide-react";
import { useKbPageCollection } from "@/hooks/api/kb/page-collection";
import type {
  KbPageCollectionItem,
  KbPageCollectionParams,
} from "@/hooks/api/kb/page-collection";
import { useKbSpaces } from "@/hooks/api/kb";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table.types";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import { useCursorPager } from "@/components/ui/table-pagination";
import { useUrlFilters, parseEnum } from "@/lib/url-state/use-url-filters";
import { pageHref } from "@/lib/knowledge-routes";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import {
  WikiPageCard,
  WIKI_PAGE_CARD_GRID_CLASS,
} from "@/features/wiki/components/wiki-page-card";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { TrustBadge, StatusBadge } from "./kb-collection-badges";

const SORT_OPTIONS = [
  { value: "updated_desc", label: "Last updated" },
  { value: "created_desc", label: "Newest" },
  { value: "title_asc", label: "Title A–Z" },
] as const;

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In review" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;

const PAGE_LIMIT = 50;

type SortValue = "updated_desc" | "created_desc" | "title_asc";
const SORT_VALUES = ["updated_desc", "created_desc", "title_asc"] as const;
const VIEW_VALUES = ["list", "card"] as const;

const BASE_COLUMNS: DataTableColumn<KbPageCollectionItem>[] = [
  {
    key: "title",
    header: "Title",
    cell: (row) => (
      <a
        href={pageHref(row.id)}
        className="font-medium text-foreground hover:underline"
      >
        {row.title}
      </a>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => <StatusBadge status={row.status} />,
  },
  {
    key: "trustState",
    header: "Trust",
    cell: (row) => <TrustBadge trustState={row.trustState} />,
  },
  {
    key: "updatedAt",
    header: "Updated",
    cell: (row) => (
      <span className="tabular-nums text-muted-foreground text-sm">
        {kbTimeAgo(row.updatedAt)}
      </span>
    ),
  },
];

export interface WikiPageCollectionTableProps {
  fixedParams: Pick<KbPageCollectionParams, "owner" | "sharedWithMe">;
  additionalColumns?: DataTableColumn<KbPageCollectionItem>[];
  emptyTitle: string;
  emptyDescription?: string;
  accessLostTitle?: string;
  accessLostDescription?: string;
}

function MobilePageCard(row: KbPageCollectionItem) {
  return (
    <WikiPageCard
      href={pageHref(row.id)}
      title={row.title}
      icon={row.icon}
      coverImage={row.coverImage}
      subtitle={kbTimeAgo(row.updatedAt)}
    >
      <StatusBadge status={row.status} />
    </WikiPageCard>
  );
}

export function WikiPageCollectionTable({
  fixedParams,
  additionalColumns = [],
  emptyTitle,
  emptyDescription,
  accessLostTitle,
  accessLostDescription,
}: WikiPageCollectionTableProps) {
  const searchParams = useSearchParams();
  const { update } = useUrlFilters();

  const rawSearch = searchParams.get("q") ?? "";
  const sort = parseEnum(
    searchParams.get("sort"),
    SORT_VALUES,
    "updated_desc",
  ) as SortValue;
  const status = searchParams.get("status") ?? "";
  const spaceParam = searchParams.get("space") ?? "";
  const spaceId = spaceParam !== "" ? Number(spaceParam) : undefined;
  const view = parseEnum(searchParams.get("view"), VIEW_VALUES, "list");

  const debouncedSearch = useDebouncedValue(rawSearch, 300);

  const { data: spaces } = useKbSpaces();

  const filterKey = `${debouncedSearch}|${sort}|${status}|${spaceParam}`;
  const pager = useCursorPager(filterKey);

  const queryParams: KbPageCollectionParams = {
    ...fixedParams,
    q: debouncedSearch || undefined,
    sort,
    status: status || undefined,
    spaceId,
    cursor: pager.cursor,
    limit: PAGE_LIMIT,
  };

  const { data, isLoading, isError, error, refetch } =
    useKbPageCollection(queryParams);

  const hadDataRef = useRef(false);
  if (data && data.data.length > 0) hadDataRef.current = true;

  const filtersActive =
    debouncedSearch !== "" ||
    status !== "" ||
    spaceParam !== "" ||
    sort !== "updated_desc";

  const isEmpty = data !== undefined && data.data.length === 0;
  const accessLost =
    hadDataRef.current &&
    isEmpty &&
    !filtersActive &&
    accessLostTitle !== undefined;

  const pageState = usePageState({
    permission: "kb:pages:view",
    isLoading,
    isError,
    error,
    isEmpty,
  });

  function handleClearFilters() {
    update({ q: null, status: null, sort: null, space: null });
  }

  function handleSearchChange(value: string) {
    update({ q: value || null });
  }

  function handleSortChange(value: string) {
    update({ sort: value });
  }

  function handleStatusChange(value: string) {
    update({ status: value === "all" ? null : value });
  }

  function handleSpaceChange(value: string) {
    update({ space: value === "all" ? null : value });
  }

  function handleViewList() {
    update({ view: null });
  }

  function handleViewCard() {
    update({ view: "card" });
  }

  const handleNext = useCallback(() => {
    pager.goNext(data?.pagination.nextCursor);
  }, [pager, data?.pagination.nextCursor]);

  const handlePrevious = useCallback(() => {
    pager.goPrevious();
  }, [pager]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const columns = [...BASE_COLUMNS, ...additionalColumns];
  const rows = data?.data ?? [];

  const emptyNode = accessLost ? (
    <EmptyState
      illustrationPreset="default"
      title={accessLostTitle ?? emptyTitle}
      description={accessLostDescription}
      action={{ label: "Refresh", onClick: handleRetry }}
    />
  ) : (
    <EmptyState
      illustrationPreset="default"
      title={emptyTitle}
      description={emptyDescription}
      filtersActive={filtersActive}
      filteredTitle="No pages match your filters."
      onClearFilters={handleClearFilters}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={rawSearch}
          onChange={handleSearchChange}
          placeholder="Search pages…"
          className="h-9 w-48 shrink-0"
        />
        <Select value={status || "all"} onValueChange={handleStatusChange}>
          <SelectTrigger className="h-9 w-36 shrink-0">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {spaces && spaces.length > 0 && (
          <Select value={spaceParam || "all"} onValueChange={handleSpaceChange}>
            <SelectTrigger className="h-9 w-40 shrink-0">
              <SelectValue placeholder="Space" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All spaces</SelectItem>
              {spaces.map((space) => (
                <SelectItem key={space.id} value={String(space.id)}>
                  {space.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={sort} onValueChange={handleSortChange}>
          <SelectTrigger className="h-9 w-40 shrink-0">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant={view === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-9 w-9"
            aria-label="List view"
            onClick={handleViewList}
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={view === "card" ? "secondary" : "ghost"}
            size="icon"
            className="h-9 w-9"
            aria-label="Card view"
            onClick={handleViewCard}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <PageState
        resolution={pageState}
        loading={<DataTableSkeleton columns={columns.length} />}
        empty={emptyNode}
        onRetry={handleRetry}
      >
        {view === "card" ? (
          rows.length === 0 ? (
            emptyNode
          ) : (
            <div className={WIKI_PAGE_CARD_GRID_CLASS}>
              {rows.map((row) => (
                <MobilePageCard key={row.id} {...row} />
              ))}
            </div>
          )
        ) : (
          <DataTable
            data={rows}
            columns={columns}
            getRowKey={(row) => row.id}
            emptyState={emptyNode}
            mobileCard={MobilePageCard}
            pagination={{
              mode: "cursor",
              pageSize: PAGE_LIMIT,
              hasMore: data?.pagination.hasMore ?? false,
              hasPrevious: pager.hasPrevious,
              onNext: handleNext,
              onPrevious: handlePrevious,
            }}
          />
        )}
      </PageState>
    </div>
  );
}
