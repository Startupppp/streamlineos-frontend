"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
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
} from "@/hooks/api/kb/page-reviews";
import type {
  KbPageReview,
  KbReviewStatus,
  KbReviewType,
} from "@/hooks/api/kb/page-reviews";
import { pageHref } from "@/features/wiki/lib/knowledge-routes";
import { cn } from "@/lib/utils";
import {
  KbClipboardCheckIcon,
  KbLockIcon,
  KbCheckCircleIcon,
  KbXCircleIcon,
  KbAlertCircleIcon,
} from "@/features/wiki/lib/kb-icons";
import { kbFormatDate } from "@/features/wiki/lib/kb-date-utils";

type StatusFilter = "all" | KbReviewStatus;
type TypeFilter = "all" | KbReviewType;

function isOverdue(dueAt: string | null, status: KbReviewStatus): boolean {
  if (!dueAt || status !== "pending") return false;
  return new Date(dueAt) < new Date();
}

function StatusBadge({ status }: { status: KbReviewStatus }) {
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
        onError: () => toast.error("Failed to approve review"),
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
          <TruncatedText text={review.pageTitle ?? ""} lines={2} className="text-sm text-muted-foreground" />
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
        onError: () => toast.error("Failed to reject review"),
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
          <TruncatedText text={review.pageTitle ?? ""} lines={2} className="text-sm text-muted-foreground" />
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

export default function ReviewsPage() {
  const canView = useCan("kb:reviews:view");
  const canManage = useCan("kb:reviews:manage");

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [approveTarget, setApproveTarget] = useState<KbPageReview | null>(null);
  const [rejectTarget, setRejectTarget] = useState<KbPageReview | null>(null);

  const params = {
    status: statusFilter === "all" ? undefined : statusFilter,
    type: typeFilter === "all" ? undefined : typeFilter,
  };

  const { data: reviews = [], isLoading, isError } = useKbPageReviews(params);

  const handleStatusChange = useCallback((val: string) => {
    setStatusFilter(val as StatusFilter);
  }, []);

  const handleTypeChange = useCallback((val: string) => {
    setTypeFilter(val as TypeFilter);
  }, []);

  const handleCloseApprove = useCallback(() => setApproveTarget(null), []);
  const handleCloseReject = useCallback(() => setRejectTarget(null), []);

  function makeApproveHandler(review: KbPageReview) {
    return function handleApprove() { setApproveTarget(review); };
  }

  function makeRejectHandler(review: KbPageReview) {
    return function handleReject() { setRejectTarget(review); };
  }

  const columns = useMemo<DataTableColumn<KbPageReview>[]>(() => [
    {
      key: "page",
      header: "Page",
      cell: (review) => (
        <Link
          href={pageHref(review.pageId)}
          className="text-sm font-medium text-foreground hover:text-accent transition-colors line-clamp-1"
        >
          {review.pageTitle || "Untitled"}
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
      cell: (review) => <StatusBadge status={review.status} />,
    },
    {
      key: "reviewer",
      header: "Reviewer",
      headerClassName: "hidden md:table-cell",
      className: "hidden md:table-cell",
      cell: (review) => (
        <span className="text-sm text-muted-foreground">{review.reviewerName ?? "—"}</span>
      ),
    },
    {
      key: "dueDate",
      header: "Due date",
      headerClassName: "hidden lg:table-cell",
      className: "hidden lg:table-cell",
      cell: (review) => {
        const overdue = isOverdue(review.dueAt, review.status);
        return (
          <span
            className={cn(
              "text-sm tabular-nums",
              overdue ? "text-status-danger-ink font-medium" : "text-muted-foreground",
            )}
          >
            {review.dueAt ? kbFormatDate(review.dueAt) : "—"}
            {overdue && " (overdue)"}
          </span>
        );
      },
    },
    {
      key: "requestedBy",
      header: "Requested by",
      headerClassName: "hidden lg:table-cell",
      className: "hidden lg:table-cell",
      cell: (review) => (
        <span className="text-sm text-muted-foreground">{review.requestedByName ?? "—"}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
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
  ], [canManage]);

  if (!canView) {
    return (
      <PageWrapper title="Reviews">
        <EmptyState
          illustration={
            <KbLockIcon className="w-8 text-muted-foreground/40" />
          }
          title="Access restricted"
          description="You don't have permission to view knowledge base reviews."
          className={CONTENT_FILL_PANEL}
        />
      </PageWrapper>
    );
  }

  const filters = (
    <>
      <Select value={statusFilter} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
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
      <PageWrapper
        title="Reviews"
        badge={reviews.length > 0 ? String(reviews.length) : undefined}
        filters={filters}
      >
        {isError ? (
          <EmptyState
            illustration={
              <KbAlertCircleIcon className="w-8 text-muted-foreground/40" />
            }
            title="Failed to load reviews"
            description="An error occurred while fetching reviews."
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <DataTable
            data={reviews}
            columns={columns}
            getRowKey={(review) => review.id}
            isLoading={isLoading}
            className="flex-1 min-h-0"
            emptyState={
              <EmptyState
                illustration={
                  <KbClipboardCheckIcon className="w-8 text-muted-foreground/40" />
                }
                title="No reviews"
                description={
                  statusFilter !== "all" || typeFilter !== "all"
                    ? "No reviews match the current filters."
                    : "No pages are currently under review."
                }
                className={CONTENT_FILL_PANEL}
              />
            }
          />
        )}
      </PageWrapper>
    </>
  );
}
