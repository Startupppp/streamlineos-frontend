"use client";

import { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn, DataTableSortState } from "@/components/ui/data-table.types";
import { WikiTableRowsSkeleton } from "./wiki-collection-skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useUrlFilters, parseEnum } from "@/lib/url-state/use-url-filters";
import { useCan } from "@/hooks/api/access";
import { TrustBadge } from "@/features/wiki/components/kb-collection-badges";
import { useKbPageReviews } from "@/hooks/api/kb/page-reviews";
import type {
  KbPageReview,
  BulkDecideResultItem,
} from "@/hooks/api/kb/page-reviews";
import { pageHref } from "@/lib/knowledge-routes";
import { cn } from "@/lib/utils";
import { kbFormatDate } from "@/features/wiki/lib/kb-date-utils";
import { ReviewsFilters } from "./reviews-filters";
import { ReviewMobileCard, StatusBadge, TypeBadge } from "./reviews-mobile-card";
import { ApproveDialog, RejectDialog } from "./reviews-decision-dialogs";
import { BulkDecideDialog } from "./reviews-bulk-decide-dialog";
import {
  BulkDecideResultsDialog,
  type BulkFailureWithTitle,
} from "./reviews-bulk-results-dialog";

const STATUS_FILTER_VALUES = ["all", "pending", "approved", "rejected", "overdue"] as const;
const TYPE_FILTER_VALUES = ["all", "approval", "freshness"] as const;
const SORT_DIR_VALUES = ["asc", "desc"] as const;
const DEFAULT_LIMIT = 50;

function toDayBoundary(value: string, edge: "start" | "end"): string | undefined {
  if (!value) return undefined;
  const suffix = edge === "start" ? "T00:00:00.000Z" : "T23:59:59.999Z";
  const candidate = value.includes("T") ? value : `${value}${suffix}`;
  return Number.isNaN(Date.parse(candidate)) ? undefined : candidate;
}

type BulkState =
  | { kind: "idle" }
  | { kind: "deciding"; ids: number[] }
  | { kind: "results"; succeeded: number; failures: BulkFailureWithTitle[] };

export default function ReviewsPage() {
  const searchParams = useSearchParams();
  const { update: updateFilters } = useUrlFilters({ pageParam: "cursor" });

  const statusFilter = parseEnum(searchParams.get("status"), STATUS_FILTER_VALUES, "all");
  const typeFilter = parseEnum(searchParams.get("type"), TYPE_FILTER_VALUES, "all");
  const sortDir = parseEnum(searchParams.get("sortDir"), SORT_DIR_VALUES, "asc");
  const searchFilter = searchParams.get("q") ?? "";
  const spaceFilter = searchParams.get("spaceId") ?? "";
  const reviewerFilter = searchParams.get("reviewer") ?? "";
  const dueFromFilter = searchParams.get("dueFrom") ?? "";
  const dueToFilter = searchParams.get("dueTo") ?? "";
  const cursor = searchParams.get("cursor") || undefined;
  const cursorTrailValue = searchParams.get("cursorTrail");
  const cursorTrail = useMemo(() => {
    if (!cursor) return [];
    if (!cursorTrailValue) return ["~"];
    const entries = cursorTrailValue.split(".");
    return entries.length <= 100 && entries[0] === "~" && entries.slice(1).every((entry) => /^[A-Za-z0-9_-]{1,1024}$/.test(entry))
      ? entries
      : ["~"];
  }, [cursor, cursorTrailValue]);

  const hasFilters =
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    sortDir !== "asc" ||
    searchFilter !== "" ||
    spaceFilter !== "" ||
    reviewerFilter !== "" ||
    dueFromFilter !== "" ||
    dueToFilter !== "";

  const canManage = useCan("kb:reviews:manage");

  const parsedSpaceId = Number(spaceFilter);

  const params = {
    cursor,
    limit: DEFAULT_LIMIT,
    status: statusFilter === "all" ? undefined : statusFilter,
    type: typeFilter === "all" ? undefined : typeFilter,
    q: searchFilter || undefined,
    spaceId: Number.isFinite(parsedSpaceId) && parsedSpaceId > 0 ? parsedSpaceId : undefined,
    reviewer: reviewerFilter || undefined,
    dueFrom: toDayBoundary(dueFromFilter, "start"),
    dueTo: toDayBoundary(dueToFilter, "end"),
    sortDir,
  };

  const { data, isLoading, isError, error, refetch } = useKbPageReviews(params);

  const pageState = usePageState({
    permission: "kb:reviews:view",
    isLoading,
    isError,
    error,
    isEmpty: !isLoading && !isError && (data?.data.length ?? 0) === 0,
  });

  const [approveTarget, setApproveTarget] = useState<KbPageReview | null>(null);
  const [rejectTarget, setRejectTarget] = useState<KbPageReview | null>(null);
  const [bulkState, setBulkState] = useState<BulkState>({ kind: "idle" });
  const [selected, setSelected] = useState<Set<string | number>>(new Set());

  const renderMobileCard = useCallback(
    (review: KbPageReview) => (
      <ReviewMobileCard
        review={review}
        canManage={canManage}
        onApprove={setApproveTarget}
        onReject={setRejectTarget}
      />
    ),
    [canManage],
  );

  const reviews = useMemo(() => data?.data ?? [], [data]);
  const pagination = data?.pagination;

  const handleFilterPatch = useCallback(
    (patch: Record<string, string | null>) => {
      updateFilters({ ...patch, cursorTrail: null });
    },
    [updateFilters],
  );

  const handleSortChange = useCallback(
    (_field: string, direction: "asc" | "desc") => {
      updateFilters({ sortDir: direction === "asc" ? null : "desc", cursorTrail: null });
    },
    [updateFilters],
  );

  function handleClearFilters() {
    updateFilters({
      status: null,
      type: null,
      sortDir: null,
      q: null,
      spaceId: null,
      reviewer: null,
      dueFrom: null,
      dueTo: null,
      cursorTrail: null,
    });
  }

  const handleCloseApprove = useCallback(() => setApproveTarget(null), []);
  const handleCloseReject = useCallback(() => setRejectTarget(null), []);

  function handleOpenBulkDecide() {
    setBulkState({ kind: "deciding", ids: Array.from(selected).map(Number) });
  }

  const handleBulkCancel = useCallback(() => setBulkState({ kind: "idle" }), []);

  const handleBulkComplete = useCallback(
    (failures: BulkDecideResultItem[]) => {
      setSelected(new Set());
      if (failures.length === 0) {
        setBulkState({ kind: "idle" });
        return;
      }
      const failuresWithTitle: BulkFailureWithTitle[] = failures.map((f) => ({
        ...f,
        pageTitle: reviews.find((r) => r.id === f.id)?.pageTitle ?? "Unknown file",
      }));
      setBulkState({
        kind: "results",
        succeeded: (bulkState.kind === "deciding" ? bulkState.ids.length : 0) - failures.length,
        failures: failuresWithTitle,
      });
    },
    [reviews, bulkState],
  );

  const handleResultsDismiss = useCallback(() => setBulkState({ kind: "idle" }), []);

  const handleResultsRetry = useCallback(
    (ids: number[]) => {
      setBulkState({ kind: "deciding", ids });
    },
    [],
  );

  function handleGoNext() {
    if (!pagination?.nextCursor) return;
    updateFilters({
      cursor: pagination.nextCursor,
      cursorTrail: [...cursorTrail, cursor ?? "~"].join("."),
    });
  }

  function handleGoPrevious() {
    if (cursorTrail.length === 0) return;
    const previousCursor = cursorTrail[cursorTrail.length - 1];
    updateFilters({
      cursor: previousCursor === "~" ? null : previousCursor,
      cursorTrail: cursorTrail.length > 1 ? cursorTrail.slice(0, -1).join(".") : null,
    });
  }

  const sortState: DataTableSortState = {
    fields: ["dueAt"] as const,
    field: "dueAt",
    direction: sortDir,
    onChange: handleSortChange,
  };

  const columns = useMemo<DataTableColumn<KbPageReview>[]>(
    () => [
      {
        key: "page",
        header: "Page",
        cell: (review) => (
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href={pageHref(review.pageId)}
              className="text-sm font-medium text-foreground hover:text-accent transition-colors line-clamp-1"
            >
              {review.pageTitle ?? "Untitled"}
            </Link>
            {review.pageTrustState ? (
              <TrustBadge trustState={review.pageTrustState} />
            ) : null}
          </div>
        ),
      },
      {
        key: "type",
        header: "Type",
        headerClassName: "hidden sm:table-cell",
        className: "hidden sm:table-cell",
        cell: (review) => <TypeBadge type={review.type} />,
      },
      {
        key: "status",
        header: "Status",
        cell: (review) => (
          <StatusBadge status={review.status} isOverdue={review.isOverdue} />
        ),
      },
      {
        key: "reviewer",
        header: "Reviewer",
        headerClassName: "hidden md:table-cell",
        className: "hidden md:table-cell",
        cell: (review) => (
          <span className="text-sm text-muted-foreground">
            {review.reviewerName ?? "—"}
          </span>
        ),
      },
      {
        key: "dueAt",
        header: "Due date",
        headerClassName: "hidden lg:table-cell",
        className: "hidden lg:table-cell",
        cell: (review) => (
          <span
            className={cn(
              "text-sm tabular-nums font-mono",
              review.isOverdue
                ? "text-status-danger-ink font-medium"
                : "text-muted-foreground",
            )}
          >
            {review.dueAt ? kbFormatDate(review.dueAt) : "—"}
          </span>
        ),
      },
      {
        key: "requestedBy",
        header: "Requested by",
        headerClassName: "hidden lg:table-cell",
        className: "hidden lg:table-cell",
        cell: (review) => (
          <span className="text-sm text-muted-foreground">
            {review.requestedByName ?? "—"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        cell: (review) => {
          if (!canManage || review.status !== "pending") return null;
          return (
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-xs text-status-success-ink border-status-success-rule hover:bg-status-success-surface"
                onClick={() => setApproveTarget(review)}
              >
                Approve
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setRejectTarget(review)}
              >
                Reject
              </Button>
            </div>
          );
        },
      },
    ],
    [canManage],
  );

  const emptyNode = cursorTrail.length > 0 ? (
    <EmptyState
      illustrationPreset="default"
      title="No reviews on this file."
      description="The reviews on this file may have changed. Go back to continue browsing."
      action={{ label: "Previous page", onClick: handleGoPrevious }}
      compact
    />
  ) : hasFilters ? (
    <EmptyState
      illustrationPreset="default"
      title="No reviews under these filters."
      filtersActive
      filteredTitle="No reviews match your filters."
      onClearFilters={handleClearFilters}
      compact
    />
  ) : (
    <EmptyState
      illustrationPreset="default"
      title="No files under review."
      description="Assign reviews to keep your knowledge base current."
      compact
    />
  );

  const filters = (
    <>
      <ReviewsFilters
        values={{
          q: searchFilter,
          status: statusFilter,
          type: typeFilter,
          spaceId: spaceFilter,
          reviewer: reviewerFilter,
          dueFrom: dueFromFilter,
          dueTo: dueToFilter,
        }}
        onChange={handleFilterPatch}
      />
      {canManage && selected.size > 0 && (
        <Button type="button" size="sm" variant="outline" onClick={handleOpenBulkDecide}>
          Decide {selected.size} selected
        </Button>
      )}
    </>
  );

  return (
    <>
      {approveTarget && (
        <ApproveDialog review={approveTarget} onClose={handleCloseApprove} />
      )}
      {rejectTarget && (
        <RejectDialog review={rejectTarget} onClose={handleCloseReject} />
      )}
      {bulkState.kind === "deciding" && (
        <BulkDecideDialog
          ids={bulkState.ids}
          onCancel={handleBulkCancel}
          onComplete={handleBulkComplete}
        />
      )}
      {bulkState.kind === "results" && (
        <BulkDecideResultsDialog
          succeeded={bulkState.succeeded}
          failures={bulkState.failures}
          onRetry={handleResultsRetry}
          onDismiss={handleResultsDismiss}
        />
      )}
      <PageWrapper title="Reviews" filters={filters}>
        <PageState
          resolution={pageState}
          loading={<WikiTableRowsSkeleton />}
          empty={emptyNode}
          onRetry={refetch}
          className="flex-1 min-h-0"
        >
          <DataTable
            data={reviews}
            columns={columns}
            getRowKey={(review) => review.id}
            isLoading={isLoading}
            selection={{
              selected,
              onChange: setSelected,
              getRowLabel: (r) => r.pageTitle ?? "Review",
            }}
            sortState={sortState}
            mobileCard={renderMobileCard}
            className="flex-1 min-h-0"
            pagination={{
              mode: "cursor",
              pageSize: DEFAULT_LIMIT,
              pageNumber: cursorTrail.length + 1,
              hasMore: pagination?.hasMore ?? false,
              hasPrevious: cursorTrail.length > 0,
              onNext: handleGoNext,
              onPrevious: handleGoPrevious,
            }}
          />
        </PageState>
      </PageWrapper>
    </>
  );
}
