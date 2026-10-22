"use client";

import { useCallback, useEffect, useMemo, useState, Fragment } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutList, LayoutGrid } from "lucide-react";
import { useKbPageCollection } from "@/hooks/api/kb/page-collection";
import type {
  KbPageCollectionItem,
  KbPageCollectionParams,
} from "@/hooks/api/kb/page-collection";
import { useKbSpaces } from "@/hooks/api/kb";
import { useOrgMembersByIds } from "@/hooks/api/organization";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table.types";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Button } from "@/components/ui/button";
import { TablePagination, useCursorPager } from "@/components/ui/table-pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import { useUrlFilters, parseEnum } from "@/lib/url-state/use-url-filters";
import { pageHref, projectPageHref } from "@/lib/knowledge-routes";
import { WIKI_PAGE_CARD_GRID_CLASS } from "@/features/wiki/components/wiki-page-card";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getUserDisplayName } from "@/lib/person-display";
import { KbAlertCircleIcon } from "@/features/wiki/lib/kb-icons";
import { buildColumns, buildMobileCard } from "./wiki-page-collection-columns";

export const KB_PAGE_CURSOR_PARAM = "cursor";

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

const KIND_OPTIONS = [
  { value: "document", label: "Document" },
  { value: "spreadsheet", label: "Spreadsheet" },
] as const;

const PAGE_LIMIT = 50;
const SORT_VALUES = ["updated_desc", "created_desc", "title_asc"] as const;
const VIEW_VALUES = ["list", "card"] as const;

export interface WikiPageCollectionTableProps {
  fixedParams: Pick<
    KbPageCollectionParams,
    "owner" | "sharedWithMe" | "spaceId" | "projectId"
  >;
  additionalColumns?: DataTableColumn<KbPageCollectionItem>[];
  searchPlaceholder?: string | null;
  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
  emptySecondaryAction?: { label: string; href: string };
  emptyTertiaryAction?: { label: string; href: string };
  accessLostTitle?: string;
  accessLostDescription?: string;
  onRowsChange?: (rows: readonly KbPageCollectionItem[]) => void;
  onItemCountChange?: (count: number) => void;
}

export function WikiPageCollectionTable({
  fixedParams,
  additionalColumns = [],
  searchPlaceholder = "Search files…",
  emptyTitle,
  emptyDescription,
  emptyAction,
  emptySecondaryAction,
  emptyTertiaryAction,
  accessLostTitle,
  accessLostDescription,
  onRowsChange,
  onItemCountChange,
}: WikiPageCollectionTableProps) {
  const searchParams = useSearchParams();
  const { update } = useUrlFilters({ pageParam: KB_PAGE_CURSOR_PARAM });
  const isOffline = !useOnlineStatus();

  const projectId = fixedParams.projectId;
  const resolveHref = useCallback(
    (pageId: number) =>
      projectId !== undefined && projectId > 0
        ? projectPageHref(projectId, pageId)
        : pageHref(pageId),
    [projectId],
  );

  const rawSearch = searchParams.get("q") ?? "";
  const sort = parseEnum(searchParams.get("sort"), SORT_VALUES, "updated_desc");
  const status = searchParams.get("status") ?? "";
  const spaceParam = searchParams.get("space") ?? "";
  const rawSpaceId = spaceParam !== "" ? Number(spaceParam) : NaN;
  const urlSpaceId = Number.isInteger(rawSpaceId) && rawSpaceId > 0 ? rawSpaceId : undefined;
  const spaceId = fixedParams.spaceId ?? urlSpaceId;
  const view = parseEnum(searchParams.get("view"), VIEW_VALUES, "list");
  const ownerParam = searchParams.get("owner") ?? "";
  const owner = fixedParams.owner ?? (ownerParam === "me" ? "me" : undefined);
  const rawKind = searchParams.get("kind") ?? "";
  const kind: "document" | "spreadsheet" | undefined =
    rawKind === "document" || rawKind === "spreadsheet" ? rawKind : undefined;
  const urlCursor = searchParams.get(KB_PAGE_CURSOR_PARAM) ?? "";

  const debouncedSearch = useDebouncedValue(rawSearch, 300);

  const { data: spacesPage } = useKbSpaces();
  const spaces = spacesPage?.data;

  const filterKey = `${debouncedSearch}|${sort}|${status}|${spaceParam}|${owner ?? ""}|${kind ?? ""}`;

  const handleCursorChange = useCallback(
    (nextCursor: string | undefined) => {
      if ((nextCursor ?? "") === urlCursor) return;
      update({ [KB_PAGE_CURSOR_PARAM]: nextCursor ? nextCursor : null });
    },
    [update, urlCursor],
  );

  const pager = useCursorPager(filterKey, {
    initialCursor: urlCursor === "" ? undefined : urlCursor,
    onCursorChange: handleCursorChange,
  });

  const queryParams: KbPageCollectionParams = {
    ...fixedParams,
    q: debouncedSearch || undefined,
    sort,
    status: status || undefined,
    spaceId,
    owner,
    kind,
    cursor: pager.cursor,
    limit: PAGE_LIMIT,
  };

  const { data, isLoading, isError, error, refetch } =
    useKbPageCollection(queryParams);

  const rows = useMemo(() => data?.data ?? [], [data?.data]);

  const ownerUserIds = useMemo(
    () =>
      [...new Set(rows.map((r) => r.ownerUserId).filter((id): id is string => id !== null))],
    [rows],
  );
  const { data: ownersPage } = useOrgMembersByIds(ownerUserIds);
  const ownerNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of ownersPage?.data ?? []) {
      map.set(member.userId, getUserDisplayName({ name: member.name, email: member.email }));
    }
    return map;
  }, [ownersPage]);

  const [contextRowId, setContextRowId] = useState<number | null>(null);

  const [hadData, setHadData] = useState(false);
  useEffect(() => {
    if (data && data.data.length > 0 && !hadData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHadData(true);
    }
  }, [data, hadData]);

  const filtersActive =
    debouncedSearch !== "" ||
    status !== "" ||
    spaceParam !== "" ||
    kind !== undefined ||
    (fixedParams.owner === undefined && ownerParam !== "") ||
    sort !== "updated_desc";

  const isEmpty = data !== undefined && data.data.length === 0;
  const accessLost =
    hadData && isEmpty && !filtersActive && !pager.hasPrevious && accessLostTitle !== undefined;

  const pageState = usePageState({
    permission: "kb:pages:view",
    isLoading,
    isError,
    error,
    isEmpty,
  });

  useEffect(() => {
    onRowsChange?.(rows);
  }, [rows, onRowsChange]);

  useEffect(() => {
    onItemCountChange?.(rows.length);
  }, [rows.length, onItemCountChange]);

  const columns = useMemo(
    () => [
      ...buildColumns(resolveHref, ownerNames, contextRowId, setContextRowId),
      ...additionalColumns,
    ],
    [resolveHref, ownerNames, contextRowId, additionalColumns],
  );

  function handleClearFilters() {
    update({ q: null, status: null, sort: null, space: null, owner: null, kind: null });
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

  function handleOwnerChange(value: string) {
    update({ owner: value === "me" ? "me" : null });
  }

  function handleKindChange(value: string) {
    update({ kind: value === "all" ? null : value });
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

  const handleRowContextMenu = useCallback(
    (row: KbPageCollectionItem, event: React.MouseEvent) => {
      event.preventDefault();
      setContextRowId(row.id);
    },
    [],
  );

  const renderMobileCard = useCallback(
    (row: KbPageCollectionItem) =>
      buildMobileCard(row, resolveHref, ownerNames, contextRowId, setContextRowId),
    [resolveHref, ownerNames, contextRowId],
  );

  const emptyNode = pager.hasPrevious ? (
    <EmptyState
      illustrationPreset="default"
      title="No files on this page"
      description="The pages on this page may have changed. Go back to continue browsing."
      action={{ label: "Previous page", onClick: handlePrevious }}
      className={CONTENT_FILL_PANEL}
    />
  ) : accessLost ? (
    <EmptyState
      illustrationPreset="default"
      title={accessLostTitle ?? emptyTitle}
      description={accessLostDescription}
      action={{ label: "Refresh", onClick: handleRetry }}
      className={CONTENT_FILL_PANEL}
    />
  ) : (
    <EmptyState
      illustrationPreset="default"
      title={emptyTitle}
      description={emptyDescription}
      filtersActive={filtersActive}
      filteredTitle="No results match your filters."
      onClearFilters={handleClearFilters}
      action={emptyAction}
      secondaryAction={emptySecondaryAction}
      tertiaryAction={emptyTertiaryAction}
      className={CONTENT_FILL_PANEL}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {isOffline && (
        <span
          className="flex items-center gap-1 text-xs text-status-warning-ink"
          data-testid="offline-indicator"
        >
          <KbAlertCircleIcon className="h-3 w-3" />
          Offline — data may be stale
        </span>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {searchPlaceholder !== null && (
          <SearchInput
            value={rawSearch}
            onValueChange={handleSearchChange}
            placeholder={searchPlaceholder}
            className="h-9 w-48 shrink-0"
          />
        )}
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
        <Select value={kind ?? "all"} onValueChange={handleKindChange}>
          <SelectTrigger className="h-9 w-36 shrink-0">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {KIND_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fixedParams.owner === undefined && (
          <Select value={owner ?? "all"} onValueChange={handleOwnerChange}>
            <SelectTrigger className="h-9 w-32 shrink-0">
              <SelectValue placeholder="Owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Anyone</SelectItem>
              <SelectItem value="me">Me</SelectItem>
            </SelectContent>
          </Select>
        )}
        {!fixedParams.spaceId && spaces && spaces.length > 0 && (
          <Select value={spaceParam || "all"} onValueChange={handleSpaceChange}>
            <SelectTrigger className="h-9 w-40 shrink-0" aria-label="Team folder">
              <SelectValue placeholder="Team folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All team folders</SelectItem>
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
        <div className="ml-auto flex items-center gap-2">
          {data?.boundedCount !== undefined && (
            <span className="text-sm text-muted-foreground tabular-nums">
              {data.boundedCount.isExact
                ? `${data.boundedCount.count} ${data.boundedCount.count === 1 ? "document" : "documents"}`
                : `${data.boundedCount.count}+ documents`}
            </span>
          )}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-9 w-9"
              aria-label="List view"
              aria-pressed={view === "list"}
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
              aria-pressed={view === "card"}
              onClick={handleViewCard}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <PageState
        resolution={pageState}
        loading={<DataTableSkeleton columns={columns.length} />}
        empty={emptyNode}
        onRetry={handleRetry}
        className={CONTENT_FILL_PANEL}
      >
        {view === "card" ? (
          rows.length === 0 ? (
            emptyNode
          ) : (
            <div className="flex flex-col gap-3">
              <div className={WIKI_PAGE_CARD_GRID_CLASS}>
                {rows.map((row) => (
                  <Fragment key={row.id}>{renderMobileCard(row)}</Fragment>
                ))}
              </div>
              <TablePagination
                mode="cursor"
                rowCount={rows.length}
                hasMore={data?.pagination.hasMore ?? false}
                hasPrevious={pager.hasPrevious}
                onNext={handleNext}
                onPrevious={handlePrevious}
              />
            </div>
          )
        ) : (
          <DataTable
            data={rows}
            columns={columns}
            getRowKey={(row) => row.id}
            onRowContextMenu={handleRowContextMenu}
            emptyState={emptyNode}
            mobileCard={renderMobileCard}
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
