"use client";

import { useCallback, useEffect, useMemo, useState, Fragment } from "react";
import { useSearchParams } from "next/navigation";
import { useKbPageCollection } from "@/hooks/api/kb/page-collection";
import type {
  KbPageCollectionItem,
  KbPageCollectionParams,
} from "@/hooks/api/kb/page-collection";
import { useKbSpaces } from "@/hooks/api/kb/spaces";
import { useOrgMembersByIds } from "@/hooks/api/organization";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table.types";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { WikiFillTable, WikiPageCardsSkeleton } from "./wiki-collection-skeletons";
import { SearchInput } from "@/components/ui/search-input";
import { TablePagination, useCursorPager } from "@/components/ui/table-pagination";
import { useUrlFilters, parseEnum } from "@/lib/url-state/use-url-filters";
import { pageHref, projectPageHref } from "@/lib/knowledge-routes";
import { WIKI_PAGE_CARD_GRID_CLASS } from "@/features/wiki/components/wiki-page-card";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getUserDisplayName } from "@/lib/person-display";
import { KbAlertCircleIcon } from "@/features/wiki/lib/kb-icons";
import { buildColumns, buildMobileCard } from "./wiki-page-collection-columns";
import {
  VIEW_VALUES,
  type CollectionView,
  WikiPageCollectionToolbar,
} from "./wiki-page-collection-toolbar";

export function collectionCountSubtitle(
  description: string | null | undefined,
  countLabel: string | null,
) {
  const text = description?.trim() ?? "";
  if (!text && !countLabel) return undefined;
  return (
    <>
      {text || null}
      {text && countLabel ? " · " : null}
      {countLabel ? <span className="tabular-nums">{countLabel}</span> : null}
    </>
  );
}

export const KB_PAGE_CURSOR_PARAM = "cursor";

const PAGE_LIMIT = 50;
const SORT_VALUES = ["updated_desc", "created_desc", "title_asc"] as const;

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
  onDocumentCountLabelChange?: (label: string | null) => void;
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
  onDocumentCountLabelChange,
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

  function handleViewChange(next: CollectionView) {
    update({ view: next === "list" ? null : next });
  }

  const activeFilterCount =
    (status !== "" ? 1 : 0) +
    (kind !== undefined ? 1 : 0) +
    (fixedParams.owner === undefined && ownerParam !== "" ? 1 : 0) +
    (!fixedParams.spaceId && spaceParam !== "" ? 1 : 0) +
    (sort !== "updated_desc" ? 1 : 0);

  const documentCountLabel =
    data?.boundedCount !== undefined
      ? data.boundedCount.isExact
        ? `${data.boundedCount.count} ${data.boundedCount.count === 1 ? "document" : "documents"}`
        : `${data.boundedCount.count}+ documents`
      : null;

  useEffect(() => {
    onDocumentCountLabelChange?.(documentCountLabel);
  }, [documentCountLabel, onDocumentCountLabelChange]);

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
      <div className="flex w-full min-w-0 items-center gap-2">
        {searchPlaceholder !== null && (
          <SearchInput
            value={rawSearch}
            onValueChange={handleSearchChange}
            placeholder={searchPlaceholder}
            className="h-9 !w-auto !min-w-0 max-w-full flex-1 basis-0 sm:max-w-xs"
          />
        )}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <WikiPageCollectionToolbar
            status={status}
            kind={kind}
            owner={owner}
            showOwnerFilter={fixedParams.owner === undefined}
            spaceParam={spaceParam}
            spaces={spaces}
            showSpaceFilter={fixedParams.spaceId === undefined}
            sort={sort}
            view={view}
            activeFilterCount={activeFilterCount}
            onStatusChange={handleStatusChange}
            onKindChange={handleKindChange}
            onOwnerChange={handleOwnerChange}
            onSpaceChange={handleSpaceChange}
            onSortChange={handleSortChange}
            onViewChange={handleViewChange}
            onClearFilters={handleClearFilters}
          />
        </div>
      </div>
      <PageState
        resolution={pageState}
        loading={
          view === "card" ? (
            <WikiPageCardsSkeleton />
          ) : (
            <WikiFillTable headers={columns.map((column) => column.header)} />
          )
        }
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
