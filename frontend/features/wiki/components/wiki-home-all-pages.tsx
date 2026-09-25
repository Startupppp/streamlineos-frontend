"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { LayoutList, LayoutGrid } from "lucide-react";
import { useKbPageCollection } from "@/hooks/api/kb/page-collection";
import type { KbPageCollectionItem } from "@/hooks/api/kb/page-collection";
import { useKbSpaces, useCreateKbPage } from "@/hooks/api/kb";
import { useCan } from "@/hooks/api/access";
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
import { useCursorPager } from "@/components/ui/table-pagination";
import { useUrlFilters, parseEnum } from "@/lib/url-state/use-url-filters";
import {
  pageHref,
  projectPageHref,
  KB_IMPORT,
  KB_TEMPLATES,
} from "@/lib/knowledge-routes";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import { WikiPageCard, WIKI_PAGE_CARD_GRID_CLASS } from "./wiki-page-card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, TrustBadge } from "./kb-collection-badges";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

const SORT_VALUES = ["updated_desc", "created_desc", "title_asc"] as const;
const VIEW_VALUES = ["list", "card"] as const;
type SortValue = (typeof SORT_VALUES)[number];

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
}

export interface WikiHomeAllPagesProps {
  projectId?: number;
}

export function WikiHomeAllPages({ projectId }: WikiHomeAllPagesProps) {
  const isProjectScoped = projectId !== undefined && projectId > 0;
  const searchParams = useSearchParams();
  const router = useRouter();
  const { update } = useUrlFilters();

  const resolveHref = useCallback(
    (pageId: number) =>
      isProjectScoped ? projectPageHref(projectId!, pageId) : pageHref(pageId),
    [isProjectScoped, projectId],
  );

  const columns = useMemo(() => buildColumns(resolveHref), [resolveHref]);

  const status = searchParams.get("status") ?? "";
  const spaceParam = searchParams.get("space") ?? "";
  const spaceId = spaceParam !== "" ? Number(spaceParam) : undefined;
  const ownerParam = searchParams.get("owner") ?? "";
  const sort = parseEnum(
    searchParams.get("sort"),
    SORT_VALUES,
    "updated_desc",
  ) as SortValue;
  const view = parseEnum(searchParams.get("view"), VIEW_VALUES, "list");

  const filtersActive =
    status !== "" || spaceParam !== "" || ownerParam !== "" || sort !== "updated_desc";

  const filterKey = `${status}|${spaceParam}|${ownerParam}|${sort}`;
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

  function AllPagesCard(row: KbPageCollectionItem) {
    return (
      <WikiPageCard
        href={resolveHref(row.id)}
        title={row.title}
        icon={row.icon}
        coverImage={row.coverImage}
        subtitle={kbTimeAgo(row.updatedAt)}
      >
        <StatusBadge status={row.status} />
        <TrustBadge trustState={row.trustState} />
        {row.ownerMembershipId === null ? (
          <Badge
            variant="outline"
            className="text-micro h-4 px-1.5 text-muted-foreground"
          >
            Owner missing
          </Badge>
        ) : null}
      </WikiPageCard>
    );
  }

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
            <div className={WIKI_PAGE_CARD_GRID_CLASS}>
              {rows.map((row) => (
                <AllPagesCard key={row.id} {...row} />
              ))}
            </div>
          )
        ) : (
          <DataTable
            data={rows}
            columns={columns}
            getRowKey={(row) => row.id}
            emptyState={emptyNode}
            mobileCard={AllPagesCard}
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
