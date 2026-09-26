"use client";

import { Fragment, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { LayoutList, LayoutGrid } from "lucide-react";
import { useKbPageCollection } from "@/hooks/api/kb/page-collection";
import type {
  KbPageCollectionItem,
  KbPageCollectionParams,
} from "@/hooks/api/kb/page-collection";
import {
  useKbSpaces,
  useDeleteKbPage,
  useDuplicateKbPage,
  useToggleFavoriteKbPage,
} from "@/hooks/api/kb";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table.types";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { pageHref } from "@/lib/knowledge-routes";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import {
  WikiPageCard,
  WIKI_PAGE_CARD_GRID_CLASS,
} from "@/features/wiki/components/wiki-page-card";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { TrustBadge, StatusBadge } from "./kb-collection-badges";
import {
  resolveKbPageActions,
  groupKbPageActions,
  type KbPageActionCapabilities,
  type KbPageActionSubject,
  toKbPageActionId,
} from "@/features/wiki/lib/page-action-descriptors";
import { KbMoreHorizontalIcon } from "@/features/wiki/lib/kb-icons";

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

interface CollectionItemMenuProps {
  page: KbPageCollectionItem;
}

function CollectionItemMenu({ page }: CollectionItemMenuProps) {
  const router = useRouter();
  const canCreate = useCan("kb:pages:create");
  const canUpdate = useCan("kb:pages:update");
  const canManage = useCan("kb:pages:manage");
  const canDelete = useCan("kb:pages:delete");
  const canExport = useCan("kb:pages:export");
  const canManageTemplates = useCan("kb:templates:manage");
  const toggleFavorite = useToggleFavoriteKbPage();
  const duplicatePage = useDuplicateKbPage();
  const deletePage = useDeleteKbPage();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const capabilities: KbPageActionCapabilities = {
    canCreate,
    canUpdate,
    canManage,
    canDelete,
    canExport,
    canManageTemplates,
    isEditable: canUpdate,
  };

  const subject: KbPageActionSubject = {
    isFavorite: false,
    isLocked: false,
    hasCover: page.coverImage !== null,
  };

  const actions = resolveKbPageActions(subject, capabilities);
  const groups = groupKbPageActions(actions);

  function handleDeleteOpenChange(open: boolean) {
    setDeleteOpen(open);
  }

  function handleDeleteConfirm() {
    deletePage.mutate(page.id, {
      onSuccess: () => toast.success("Page deleted"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
    setDeleteOpen(false);
  }

  function handleSelect(event: Event) {
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;
    const actionId = toKbPageActionId(target.dataset.actionId);
    if (!actionId) return;
    if (actionId === "favorite") {
      toggleFavorite.mutate(
        { pageId: page.id, isFavorite: false },
        { onError: (err) => toast.error(getErrorMessage(err)) },
      );
    } else if (actionId === "duplicate") {
      duplicatePage.mutate(page.id, {
        onSuccess: (dup) => {
          toast.success("Page duplicated");
          router.push(pageHref(dup.id));
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    } else if (actionId === "delete") {
      setDeleteOpen(true);
    } else {
      router.push(pageHref(page.id));
    }
  }

  return (
    <>
      <ConfirmDialog
        title="Delete page"
        description="This page will be moved to trash and can be restored for 30 days."
        confirmLabel="Delete"
        destructive
        isPending={deletePage.isPending}
        open={deleteOpen}
        onOpenChange={handleDeleteOpenChange}
        onConfirm={handleDeleteConfirm}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            aria-label="Page actions"
          >
            <KbMoreHorizontalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {groups.map((group, groupIndex) => (
            <Fragment key={group[0]?.group ?? String(groupIndex)}>
              {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
              {group.map((action) => (
                <DropdownMenuItem
                  key={action.id}
                  data-action-id={action.id}
                  variant={action.destructive ? "destructive" : "default"}
                  onSelect={handleSelect}
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </DropdownMenuItem>
              ))}
            </Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

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
  {
    key: "actions",
    header: "",
    cell: (row) => <CollectionItemMenu page={row} />,
  },
];

export interface WikiPageCollectionTableProps {
  fixedParams: Pick<KbPageCollectionParams, "owner" | "sharedWithMe" | "spaceId">;
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
      menu={<CollectionItemMenu page={row} />}
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
  const urlSpaceId = spaceParam !== "" ? Number(spaceParam) : undefined;
  const spaceId = fixedParams.spaceId ?? urlSpaceId;
  const view = parseEnum(searchParams.get("view"), VIEW_VALUES, "list");
  const ownerParam = searchParams.get("owner") ?? "";
  const owner = fixedParams.owner ?? (ownerParam === "me" ? "me" : undefined);

  const debouncedSearch = useDebouncedValue(rawSearch, 300);

  const { data: spacesPage } = useKbSpaces();
  const spaces = spacesPage?.data;

  const filterKey = `${debouncedSearch}|${sort}|${status}|${spaceParam}|${owner ?? ""}`;
  const pager = useCursorPager(filterKey);

  const queryParams: KbPageCollectionParams = {
    ...fixedParams,
    q: debouncedSearch || undefined,
    sort,
    status: status || undefined,
    spaceId,
    owner,
    cursor: pager.cursor,
    limit: PAGE_LIMIT,
  };

  const { data, isLoading, isError, error, refetch } =
    useKbPageCollection(queryParams);

  const [hadData, setHadData] = useState(false);
  if (!hadData && data && data.data.length > 0) setHadData(true);

  const filtersActive =
    debouncedSearch !== "" ||
    status !== "" ||
    spaceParam !== "" ||
    (fixedParams.owner === undefined && ownerParam !== "") ||
    sort !== "updated_desc";

  const isEmpty = data !== undefined && data.data.length === 0;
  const accessLost =
    hadData && isEmpty && !filtersActive && accessLostTitle !== undefined;

  const pageState = usePageState({
    permission: "kb:pages:view",
    isLoading,
    isError,
    error,
    isEmpty,
  });

  function handleClearFilters() {
    update({ q: null, status: null, sort: null, space: null, owner: null });
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
      filteredTitle="No results match your filters."
      onClearFilters={handleClearFilters}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={rawSearch}
          onValueChange={handleSearchChange}
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
            <div className="flex flex-col gap-3">
              <div className={WIKI_PAGE_CARD_GRID_CLASS}>
                {rows.map((row) => (
                  <MobilePageCard key={row.id} {...row} />
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
