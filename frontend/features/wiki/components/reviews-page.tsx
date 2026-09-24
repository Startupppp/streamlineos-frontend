"use client";

import { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn, DataTableSortState } from "@/components/ui/data-table.types";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCursorPagination } from "@/hooks/common/use-cursor-pagination";
import { useUrlFilters, parseEnum } from "@/lib/url-state/use-url-filters";
import { useCan } from "@/hooks/api/access";
import { useKbPageReviews } from "@/hooks/api/kb/page-reviews";
import type {
  KbPageReview,
  KbReviewStatus,
  KbReviewStatusFilter,
  KbReviewType,
  BulkDecideResultItem,
} from "@/hooks/api/kb/page-reviews";
import { pageHref } from "@/lib/knowledge-routes";
import { cn } from "@/lib/utils";
import {
  KbAlertCircleIcon,
  KbCheckCircleIcon,
  KbXCircleIcon,
} from "@/features/wiki/lib/kb-icons";
import { kbFormatDate } from "@/features/wiki/lib/kb-date-utils";
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

type BulkState =
  | { kind: "idle" }
  | { kind: "deciding"; ids: number[] }
  | { kind: "results"; succeeded: number; failures: BulkFailureWithTitle[] };

function ReviewsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}

function StatusBadge({
  status,
  isOverdue,
}: {
  status: KbReviewStatus;
  isOverdue: boolean;
}) {
  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-dense font-medium bg-status-danger-surface text-status-danger-ink border border-status-danger-rule">
        <KbAlertCircleIcon className="h-3 w-3" />
        Overdue
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-dense font-medium bg-status-warning-surface text-status-warning-ink border border-status-warning-rule">
        <KbAlertCircleIcon className="h-3 w-3" />
        Pending
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-dense font-medium bg-status-success-surface text-status-success-ink border border-status-success-rule">
        <KbCheckCircleIcon className="h-3 w-3" />
        Approved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-dense font-medium bg-status-danger-surface text-status-danger-ink border border-status-danger-rule">
      <KbXCircleIcon className="h-3 w-3" />
      Rejected
    </span>
  );
}

function TypeBadge({ type }: { type: KbReviewType }) {
  if (type === "approval") {
    return (
      <Badge className="bg-primary/10 text-foreground border-primary/20 text-dense" variant="outline">
        Approval
      </Badge>
    );
  }
  return (
    <Badge className="bg-status-info-surface text-status-info-ink border-status-info-rule text-dense" variant="outline">
      Freshness
    </Badge>
  );
}

function ReviewMobileCard(review: KbPageReview) {
  return (
    <div className="flex flex-col gap-1.5 px-3 py-2.5">
      <Link
        href={pageHref(review.pageId)}
        className="font-medium text-foreground line-clamp-1 hover:text-accent transition-colors"
      >
        {review.pageTitle ?? "Untitled"}
      </Link>
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge status={review.status} isOverdue={review.isOverdue} />
        <TypeBadge type={review.type} />
      </div>
      <span className="text-sm text-muted-foreground">
        {review.reviewerName ?? "No reviewer"}
        {review.dueAt ? ` · Due ${kbFormatDate(review.dueAt)}` : ""}
      </span>
    </div>
  );
}

export default function ReviewsPage() {
  const searchParams = useSearchParams();
  const { update: updateFilters } = useUrlFilters({ pageParam: "cursor" });

  const statusFilter = parseEnum(searchParams.get("status"), STATUS_FILTER_VALUES, "all");
  const typeFilter = parseEnum(searchParams.get("type"), TYPE_FILTER_VALUES, "all");
  const sortDir = parseEnum(searchParams.get("sortDir"), SORT_DIR_VALUES, "asc") as "asc" | "desc";

  const hasFilters = statusFilter !== "all" || typeFilter !== "all" || sortDir !== "asc";

  const cursorState = useCursorPagination();
  const canManage = useCan("kb:reviews:manage");

  const params = {
    cursor: cursorState.cursor,
    limit: DEFAULT_LIMIT,
    status: statusFilter === "all" ? undefined : (statusFilter as KbReviewStatusFilter),
    type: typeFilter === "all" ? undefined : (typeFilter as KbReviewType),
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

  const reviews = useMemo(() => data?.data ?? [], [data]);
  const pagination = data?.pagination;

  const handleStatusChange = useCallback(
    (val: string) => {
      updateFilters({ status: val === "all" ? null : val });
      cursorState.reset();
    },
    [updateFilters, cursorState],
  );

  const handleTypeChange = useCallback(
    (val: string) => {
      updateFilters({ type: val === "all" ? null : val });
      cursorState.reset();
    },
    [updateFilters, cursorState],
  );

  const handleSortChange = useCallback(
    (_field: string, direction: "asc" | "desc") => {
      updateFilters({ sortDir: direction === "asc" ? null : "desc" });
      cursorState.reset();
    },
    [updateFilters, cursorState],
  );

  function handleClearFilters() {
    updateFilters({ status: null, type: null, sortDir: null });
    cursorState.reset();
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
        pageTitle: reviews.find((r) => r.id === f.id)?.pageTitle ?? "Unknown page",
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
    cursorState.goNext(pagination?.nextCursor);
  }

  function handleGoPrevious() {
    cursorState.goPrevious();
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
          <Link
            href={pageHref(review.pageId)}
            className="text-sm font-medium text-foreground hover:text-accent transition-colors line-clamp-1"
          >
            {review.pageTitle ?? "Untitled"}
          </Link>
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

  const emptyNode = hasFilters ? (
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
      title="No pages under review."
      description="Assign reviews to keep your knowledge base current."
      compact
    />
  );

  const filters = (
    <>
      <Select value={statusFilter} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
          <SelectItem value="overdue">Overdue</SelectItem>
        </SelectContent>
      </Select>
      <Select value={typeFilter} onValueChange={handleTypeChange}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="approval">Approval</SelectItem>
          <SelectItem value="freshness">Freshness</SelectItem>
        </SelectContent>
      </Select>
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
          loading={<ReviewsSkeleton />}
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
            mobileCard={ReviewMobileCard}
            className="flex-1 min-h-0"
            pagination={{
              mode: "cursor",
              pageSize: DEFAULT_LIMIT,
              pageNumber: cursorState.pageNumber,
              hasMore: pagination?.hasMore ?? false,
              hasPrevious: cursorState.hasPrevious,
              onNext: handleGoNext,
              onPrevious: handleGoPrevious,
            }}
          />
        </PageState>
      </PageWrapper>
    </>
  );
}
