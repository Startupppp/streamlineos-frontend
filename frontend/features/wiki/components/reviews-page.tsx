"use client";

import { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table.types";
import { useCursorPagination } from "@/hooks/common/use-cursor-pagination";
import { useUrlFilters, parseEnum } from "@/lib/url-state/use-url-filters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCan } from "@/hooks/api/access";
import {
  useKbPageReviews,
  useApprovePageReview,
  useRejectPageReview,
  useBulkDecidePageReviews,
} from "@/hooks/api/kb/page-reviews";
import type {
  KbPageReview,
  KbReviewStatus,
  KbReviewStatusFilter,
  KbReviewType,
} from "@/hooks/api/kb/page-reviews";
import { pageHref } from "@/lib/knowledge-routes";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import {
  KbClipboardCheckIcon,
  KbCheckCircleIcon,
  KbXCircleIcon,
  KbAlertCircleIcon,
} from "@/features/wiki/lib/kb-icons";
import { kbFormatDate } from "@/features/wiki/lib/kb-date-utils";

const STATUS_FILTER_VALUES = [
  "all",
  "pending",
  "approved",
  "rejected",
  "overdue",
] as const;
const TYPE_FILTER_VALUES = ["all", "approval", "freshness"] as const;
const DEFAULT_LIMIT = 50;

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
      <Badge
        className="bg-primary/10 text-foreground border-primary/20 text-dense"
        variant="outline"
      >
        Approval
      </Badge>
    );
  }
  return (
    <Badge
      className="bg-status-info-surface text-status-info-ink border-status-info-rule text-dense"
      variant="outline"
    >
      Freshness
    </Badge>
  );
}

type ApproveDialogProps = {
  review: KbPageReview;
  onClose: () => void;
};

function ApproveDialog({ review, onClose }: ApproveDialogProps) {
  const [note, setNote] = useState("");
  const approve = useApprovePageReview();

  function handleNoteChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setNote(e.target.value);
  }

  function handleApprove() {
    approve.mutate(
      { reviewId: review.id, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Review approved");
          onClose();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Approve review</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 px-0 py-2">
          <TruncatedText
            text={review.pageTitle ?? ""}
            lines={2}
            className="text-sm text-muted-foreground"
          />
          <div className="space-y-1.5">
            <Label className="text-xs">Note (optional)</Label>
            <Textarea
              value={note}
              onChange={handleNoteChange}
              placeholder="Add a note…"
              className="text-sm resize-none"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={approve.isPending}
            className="bg-status-success-fill hover:bg-status-success-fill-hover text-white"
          >
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type RejectDialogProps = {
  review: KbPageReview;
  onClose: () => void;
};

function RejectDialog({ review, onClose }: RejectDialogProps) {
  const [note, setNote] = useState("");
  const reject = useRejectPageReview();

  function handleNoteChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setNote(e.target.value);
  }

  function handleReject() {
    if (!note.trim()) return;
    reject.mutate(
      { reviewId: review.id, note: note.trim() },
      {
        onSuccess: () => {
          toast.success("Review rejected");
          onClose();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reject review</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 px-0 py-2">
          <TruncatedText
            text={review.pageTitle ?? ""}
            lines={2}
            className="text-sm text-muted-foreground"
          />
          <div className="space-y-1.5">
            <Label className="text-xs">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={note}
              onChange={handleNoteChange}
              placeholder="Explain why this review is rejected…"
              className="text-sm resize-none"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleReject}
            disabled={reject.isPending || !note.trim()}
          >
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type BulkDecideDialogProps = {
  selectedIds: number[];
  onClose: () => void;
};

function BulkDecideDialog({ selectedIds, onClose }: BulkDecideDialogProps) {
  const [decision, setDecision] = useState<"approved" | "rejected">("approved");
  const [note, setNote] = useState("");
  const bulkDecide = useBulkDecidePageReviews();

  function handleDecisionChange(val: string) {
    if (val === "approved" || val === "rejected") setDecision(val);
  }

  function handleNoteChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setNote(e.target.value);
  }

  function handleSubmit() {
    if (decision === "rejected" && !note.trim()) return;
    const input =
      decision === "approved"
        ? {
            ids: selectedIds,
            decision: "approved" as const,
            note: note.trim() || undefined,
          }
        : {
            ids: selectedIds,
            decision: "rejected" as const,
            note: note.trim(),
          };

    bulkDecide.mutate(input, {
      onSuccess: (result) => {
        const succeeded = result.results.filter(
          (r) => r.outcome === "succeeded",
        ).length;
        const conflict = result.results.filter(
          (r) => r.outcome === "conflict",
        ).length;
        const notFound = result.results.filter(
          (r) => r.outcome === "notFound",
        ).length;
        const denied = result.results.filter(
          (r) => r.outcome === "denied",
        ).length;
        if (succeeded === result.results.length) {
          toast.success(
            `${succeeded} review${succeeded !== 1 ? "s" : ""} ${decision}`,
          );
        } else {
          const parts: string[] = [`${succeeded} succeeded`];
          if (conflict) parts.push(`${conflict} already decided`);
          if (notFound) parts.push(`${notFound} not found`);
          if (denied) parts.push(`${denied} denied`);
          toast.warning(`Partial success: ${parts.join(", ")}`);
        }
        onClose();
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Bulk decide {selectedIds.length} review
            {selectedIds.length !== 1 ? "s" : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 px-0 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Decision</Label>
            <Select value={decision} onValueChange={handleDecisionChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">Approve</SelectItem>
                <SelectItem value="rejected">Reject</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Note
              {decision === "rejected" ? (
                <span className="text-destructive"> *</span>
              ) : (
                " (optional)"
              )}
            </Label>
            <Textarea
              value={note}
              onChange={handleNoteChange}
              placeholder={
                decision === "rejected"
                  ? "Explain the rejection…"
                  : "Add a note…"
              }
              className="text-sm resize-none"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant={decision === "rejected" ? "destructive" : "default"}
            onClick={handleSubmit}
            disabled={
              bulkDecide.isPending || (decision === "rejected" && !note.trim())
            }
          >
            {decision === "approved" ? "Approve all" : "Reject all"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ReviewsPage() {
  const searchParams = useSearchParams();
  const { update: updateFilters } = useUrlFilters({ pageParam: "cursor" });

  const rawStatus = searchParams.get("status");
  const rawType = searchParams.get("type");

  const statusFilter = parseEnum(rawStatus, STATUS_FILTER_VALUES, "all");
  const typeFilter = parseEnum(rawType, TYPE_FILTER_VALUES, "all");

  const cursorState = useCursorPagination();

  const params = {
    cursor: cursorState.cursor,
    limit: DEFAULT_LIMIT,
    status:
      statusFilter === "all"
        ? undefined
        : (statusFilter as KbReviewStatusFilter),
    type: typeFilter === "all" ? undefined : (typeFilter as KbReviewType),
  };

  const { data, isLoading, isError, error, refetch } = useKbPageReviews(params);

  const pageState = usePageState({
    permission: "kb:reviews:view",
    isLoading,
    isError,
    error,
    isEmpty: !isLoading && !isError && (data?.data.length ?? 0) === 0,
  });

  const canManage = useCan("kb:reviews:manage");

  const [approveTarget, setApproveTarget] = useState<KbPageReview | null>(null);
  const [rejectTarget, setRejectTarget] = useState<KbPageReview | null>(null);
  const [bulkDecideOpen, setBulkDecideOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());

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

  const handleCloseApprove = useCallback(() => setApproveTarget(null), []);
  const handleCloseReject = useCallback(() => setRejectTarget(null), []);
  const handleCloseBulk = useCallback(() => {
    setBulkDecideOpen(false);
    setSelected(new Set());
  }, []);

  function makeApproveHandler(review: KbPageReview) {
    return function handleApprove() {
      setApproveTarget(review);
    };
  }

  function makeRejectHandler(review: KbPageReview) {
    return function handleReject() {
      setRejectTarget(review);
    };
  }

  function handleGoNext() {
    cursorState.goNext(data?.pagination.nextCursor);
  }

  function handleGoPrevious() {
    cursorState.goPrevious();
  }

  function handleOpenBulkDecide() {
    setBulkDecideOpen(true);
  }

  const reviews = data?.data ?? [];
  const pagination = data?.pagination;

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
        key: "dueDate",
        header: "Due date",
        headerClassName: "hidden lg:table-cell",
        className: "hidden lg:table-cell",
        cell: (review) => (
          <span
            className={cn(
              "text-sm tabular-nums",
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
                size="sm"
                variant="outline"
                className="text-xs text-status-success-ink border-status-success-rule hover:bg-status-success-surface"
                onClick={makeApproveHandler(review)}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={makeRejectHandler(review)}
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
        <Button size="sm" variant="outline" onClick={handleOpenBulkDecide}>
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
      {bulkDecideOpen && (
        <BulkDecideDialog
          selectedIds={Array.from(selected).map(Number)}
          onClose={handleCloseBulk}
        />
      )}
      <PageWrapper title="Reviews" filters={filters}>
        <PageState
          resolution={pageState}
          loading={<ReviewsSkeleton />}
          empty={
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              {statusFilter !== "all" || typeFilter !== "all"
                ? "No reviews match the current filters."
                : "No pages are currently under review."}
            </div>
          }
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
            className="flex-1 min-h-0"
            pagination={{
              mode: "cursor",
              pageSize: DEFAULT_LIMIT,
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
