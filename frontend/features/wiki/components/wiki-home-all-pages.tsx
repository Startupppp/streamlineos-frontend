"use client";

import { Fragment, useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { LayoutList, LayoutGrid } from "lucide-react";
import { useKbPageCollection } from "@/hooks/api/kb/page-collection";
import type { KbPageCollectionItem } from "@/hooks/api/kb/page-collection";
import {
  useKbSpaces,
  useCreateKbPage,
  useDeleteKbPage,
  useDuplicateKbPage,
  useToggleFavoriteKbPage,
  useKbPageBacklinks,
} from "@/hooks/api/kb";
import { useKbPageRecordLinks } from "@/hooks/api/kb/record-links";
import { useOrgMembersByIds } from "@/hooks/api/organization";
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
import { useUrlFilters, parseEnum } from "@/lib/url-state/use-url-filters";
import {
  pageHref,
  projectPageHref,
  KB_IMPORT,
  KB_TEMPLATES,
} from "@/lib/knowledge-routes";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import { WikiPageCard, WIKI_PAGE_CARD_GRID_CLASS } from "./wiki-page-card";
import {
  OwnerMissingBadge,
  StatusBadge,
  TrustBadge,
} from "./kb-collection-badges";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import {
  resolveKbPageActions,
  groupKbPageActions,
  type KbPageActionCapabilities,
  type KbPageActionSubject,
  toKbPageActionId,
} from "@/features/wiki/lib/page-action-descriptors";
import { KbAlertCircleIcon, KbLink2Icon, KbMoreHorizontalIcon } from "@/features/wiki/lib/kb-icons";
import { getUserDisplayName } from "@/lib/person-display";

const SORT_VALUES = ["updated_desc", "created_desc", "title_asc"] as const;
const VIEW_VALUES = ["list", "card"] as const;

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

function buildColumns(
  resolveHref: (id: number) => string,
  ownerNames: Map<string, string>,
): DataTableColumn<KbPageCollectionItem>[] {
  return [
    {
      key: "title",
      header: "Title",
      cell: (row) => (
        <a
          href={resolveHref(row.id)}
          className="font-medium text-foreground hover:underline"
        >
          {row.title || "Untitled"}
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
      cell: (row) => (
        <div className="flex flex-wrap items-center gap-1">
          <TrustBadge trustState={row.trustState} />
          <OwnerMissingBadge ownerMembershipId={row.ownerMembershipId} />
        </div>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      cell: (row) => {
        if (!row.ownerUserId) return <OwnerMissingBadge ownerMembershipId={null} />;
        const name = ownerNames.get(row.ownerUserId);
        return (
          <span className="text-sm text-foreground tabular-nums">
            {name ?? "—"}
          </span>
        );
      },
    },
    {
      key: "backlinks",
      header: "Backlinks",
      cell: (row) => <BacklinkCount pageId={row.id} />,
    },
    {
      key: "linkedRecords",
      header: "Links",
      cell: (row) => <RecordLinkCount pageId={row.id} />,
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
      cell: (row) => (
        <AllPagesItemMenu page={row} resolveHref={resolveHref} />
      ),
    },
  ];
}

function BacklinkCount({ pageId }: { pageId: number }) {
  const { data: backlinks = [] } = useKbPageBacklinks(pageId);
  return (
    <span className="tabular-nums text-sm text-muted-foreground" data-testid={`backlink-count-${pageId}`}>
      {backlinks.length}
    </span>
  );
}

function RecordLinkCount({ pageId }: { pageId: number }) {
  const { data: links = [] } = useKbPageRecordLinks(pageId);
  return (
    <span className="tabular-nums text-sm text-muted-foreground" data-testid={`record-link-count-${pageId}`}>
      {links.length}
    </span>
  );
}

interface AllPagesItemMenuProps {
  page: KbPageCollectionItem;
  resolveHref: (id: number) => string;
  menuOpen?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
}

function AllPagesItemMenu({ page, resolveHref, menuOpen: controlledOpen, onMenuOpenChange }: AllPagesItemMenuProps) {
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
  const [internalOpen, setInternalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const actualMenuOpen = isControlled ? controlledOpen : internalOpen;

  function handleMenuOpenChange(val: boolean) {
    if (isControlled) {
      onMenuOpenChange?.(val);
    } else {
      setInternalOpen(val);
    }
  }

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
          router.push(resolveHref(dup.id));
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    } else if (actionId === "delete") {
      setDeleteOpen(true);
    } else if (actionId === "copyLink") {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}${resolveHref(page.id)}`;
      navigator.clipboard.writeText(url).then(
        () => toast.success("Link copied"),
        () => toast.error("Failed to copy"),
      );
    } else {
      router.push(resolveHref(page.id));
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
      <DropdownMenu open={actualMenuOpen} onOpenChange={handleMenuOpenChange}>
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

interface AllPagesCardGridProps {
  row: KbPageCollectionItem;
  resolveHref: (id: number) => string;
}

function AllPagesCardGrid({ row, resolveHref }: AllPagesCardGridProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setMenuOpen(true);
  }, []);

  return (
    <div onContextMenu={handleContextMenu}>
      <WikiPageCard
        href={resolveHref(row.id)}
        title={row.title}
        icon={row.icon}
        coverImage={row.coverImage}
        subtitle={kbTimeAgo(row.updatedAt)}
        menu={<AllPagesItemMenu page={row} resolveHref={resolveHref} menuOpen={menuOpen} onMenuOpenChange={setMenuOpen} />}
      >
        <StatusBadge status={row.status} />
        <TrustBadge trustState={row.trustState} />
        <OwnerMissingBadge ownerMembershipId={row.ownerMembershipId} />
      </WikiPageCard>
    </div>
  );
}

export interface WikiHomeAllPagesProps {
  projectId?: number;
  onItemCountChange?: (count: number) => void;
  onRowsChange?: (rows: readonly { id: number }[]) => void;
}

export function WikiHomeAllPages({ projectId, onItemCountChange, onRowsChange }: WikiHomeAllPagesProps) {
  const isProjectScoped = projectId !== undefined && projectId > 0;
  const searchParams = useSearchParams();
  const router = useRouter();
  const { update } = useUrlFilters();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    function handleOnline() { setIsOffline(false); }
    function handleOffline() { setIsOffline(true); }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const resolveHref = useCallback(
    (pageId: number) =>
      projectId !== undefined && projectId > 0
        ? projectPageHref(projectId, pageId)
        : pageHref(pageId),
    [projectId],
  );

  const status = searchParams.get("status") ?? "";
  const spaceParam = searchParams.get("space") ?? "";
  const parsedSpaceId = spaceParam !== "" ? Number(spaceParam) : Number.NaN;
  const spaceId =
    Number.isInteger(parsedSpaceId) && parsedSpaceId > 0 ? parsedSpaceId : undefined;
  const spaceValue = spaceId === undefined ? "all" : String(spaceId);
  const ownerParam = searchParams.get("owner") ?? "";
  const sort = parseEnum(searchParams.get("sort"), SORT_VALUES, "updated_desc");
  const view = parseEnum(searchParams.get("view"), VIEW_VALUES, "list");

  const filtersActive =
    status !== "" || spaceId !== undefined || ownerParam !== "" || sort !== "updated_desc";

  const filterKey = `${status}|${spaceValue}|${ownerParam}|${sort}`;
  const pager = useCursorPager(filterKey);

  const { data: spacesPage } = useKbSpaces();
  const spaces = spacesPage?.data;
  const createPage = useCreateKbPage();
  const canCreate = useCan("kb:pages:create");
  const canImport = useCan("kb:pages:import");

  const { data, isLoading, isError, error, refetch } = useKbPageCollection({
    sort,
    status: status || undefined,
    spaceId,
    projectId: isProjectScoped ? projectId : undefined,
    owner: ownerParam === "me" ? "me" : undefined,
    cursor: pager.cursor,
    limit: PAGE_LIMIT,
  });

  const rows = data?.data ?? [];
  const isEmpty = data !== undefined && rows.length === 0;

  useEffect(() => {
    onItemCountChange?.(rows.length);
  }, [rows.length, onItemCountChange]);

  useEffect(() => {
    onRowsChange?.(rows);
  }, [rows, onRowsChange]);

  const ownerUserIds = useMemo(
    () => [...new Set(rows.map((r) => r.ownerUserId).filter((id): id is string => id !== null))],
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

  const columns = useMemo(() => buildColumns(resolveHref, ownerNames), [resolveHref, ownerNames]);

  const pageState = usePageState({
    permission: "kb:pages:view",
    isLoading,
    isError,
    error,
    isEmpty,
  });

  function handleStatusChange(value: string) {
    update({ status: value === "all" ? null : value });
  }

  function handleSpaceChange(value: string) {
    update({ space: value === "all" ? null : value });
  }

  function handleOwnerChange(value: string) {
    update({ owner: value === "all" ? null : value });
  }

  function handleSortChange(value: string) {
    update({ sort: value });
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

  const handleClearFilters = useCallback(() => {
    update({ status: null, space: null, owner: null, sort: null });
  }, [update]);

  function handleNewPage() {
    createPage.mutate(
      { projectId: isProjectScoped ? projectId : undefined },
      {
        onSuccess: (page) => router.push(resolveHref(page.id)),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  const renderMobileCard = useCallback(
    (row: KbPageCollectionItem) => (
      <AllPagesCardGrid row={row} resolveHref={resolveHref} />
    ),
    [resolveHref],
  );

  const emptyNode = filtersActive ? (
    <EmptyState
      illustrationPreset="default"
      title="All pages"
      filtersActive
      filteredTitle="No pages match your filters."
      onClearFilters={handleClearFilters}
    />
  ) : (
    <EmptyState
      illustrationPreset="default"
      title="Your wiki starts here"
      description="Create your first page to build a shared knowledge base for your team."
      action={canCreate ? { label: "Create a page", onClick: handleNewPage } : undefined}
      secondaryAction={{ label: "Browse templates", href: KB_TEMPLATES }}
      tertiaryAction={
        canImport ? { label: "Import pages", href: KB_IMPORT } : undefined
      }
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
          <Select value={spaceValue} onValueChange={handleSpaceChange}>
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

        <Select value={ownerParam || "all"} onValueChange={handleOwnerChange}>
          <SelectTrigger className="h-9 w-36 shrink-0">
            <SelectValue placeholder="Owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All owners</SelectItem>
            <SelectItem value="me">My pages</SelectItem>
          </SelectContent>
        </Select>

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
          {data !== undefined && (
            <span className="text-sm text-muted-foreground tabular-nums">
              {data.boundedCount.isExact
                ? `${data.boundedCount.count} pages`
                : `${data.boundedCount.count}+ pages`}
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
      >
        {view === "card" ? (
          rows.length === 0 ? (
            emptyNode
          ) : (
            <div className="flex flex-col gap-3">
              <div className={WIKI_PAGE_CARD_GRID_CLASS}>
                {rows.map((row) => (
                  <AllPagesCardGrid key={row.id} row={row} resolveHref={resolveHref} />
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
