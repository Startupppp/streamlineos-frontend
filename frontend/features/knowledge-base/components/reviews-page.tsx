"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { KbPageReview, KbReviewStatus, KbReviewType } from "@/hooks/api/kb/page-reviews";
import { pageHref } from "@/features/knowledge-base/lib/knowledge-routes";
import { cn } from "@/lib/utils";
import {
  KbClipboardCheckIcon,
  KbLockIcon,
  KbCheckCircleIcon,
  KbXCircleIcon,
  KbAlertCircleIcon,
} from "@/features/knowledge-base/lib/kb-icons";

type StatusFilter = "all" | KbReviewStatus;
type TypeFilter = "all" | KbReviewType;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isOverdue(dueAt: string | null, status: KbReviewStatus): boolean {
  if (!dueAt || status !== "pending") return false;
  return new Date(dueAt) < new Date();
}

function StatusBadge({ status }: { status: KbReviewStatus }) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/70">
        <KbAlertCircleIcon className="h-3 w-3" />
        Pending
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
        <KbCheckCircleIcon className="h-3 w-3" />
        Approved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-red-50 text-red-700 border border-red-200/70">
      <KbXCircleIcon className="h-3 w-3" />
      Rejected
    </span>
  );
}

function TypeBadge({ type }: { type: KbReviewType }) {
  if (type === "approval") {
    return (
      <Badge
        className="bg-blue-50 text-blue-700 border-blue-200/70 text-[11px]"
        variant="outline"
      >
        Approval
      </Badge>
    );
  }
  return (
    <Badge
      className="bg-violet-50 text-violet-700 border-violet-200/70 text-[11px]"
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
      }
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Approve review</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 px-0 py-2">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {review.pageTitle}
          </p>
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
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
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
      }
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reject review</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 px-0 py-2">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {review.pageTitle}
          </p>
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

type ReviewRowProps = {
  review: KbPageReview;
  canManage: boolean;
};

function ReviewRow({ review, canManage }: ReviewRowProps) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const handleOpenApprove = useCallback(() => setApproveOpen(true), []);
  const handleCloseApprove = useCallback(() => setApproveOpen(false), []);
  const handleOpenReject = useCallback(() => setRejectOpen(true), []);
  const handleCloseReject = useCallback(() => setRejectOpen(false), []);

  const overdue = isOverdue(review.dueAt, review.status);

  return (
    <>
      <tr className="border-b border-border/60 hover:bg-muted/30 transition-colors">
        <td className="px-3 py-2.5">
          <Link
            href={pageHref(review.pageId)}
            className="text-sm font-medium text-foreground hover:text-accent transition-colors line-clamp-1"
          >
            {review.pageTitle || "Untitled"}
          </Link>
        </td>
        <td className="px-3 py-2.5 hidden sm:table-cell">
          <TypeBadge type={review.type} />
        </td>
        <td className="px-3 py-2.5">
          <StatusBadge status={review.status} />
        </td>
        <td className="px-3 py-2.5 hidden md:table-cell">
          <span className="text-sm text-muted-foreground">
            {review.reviewerName ?? "—"}
          </span>
        </td>
        <td className="px-3 py-2.5 hidden lg:table-cell">
          <span
            className={cn(
              "text-sm tabular-nums",
              overdue ? "text-red-600 font-medium" : "text-muted-foreground"
            )}
          >
            {review.dueAt ? formatDate(review.dueAt) : "—"}
            {overdue && " (overdue)"}
          </span>
        </td>
        <td className="px-3 py-2.5 hidden lg:table-cell">
          <span className="text-sm text-muted-foreground">
            {review.requestedByName ?? "—"}
          </span>
        </td>
        <td className="px-3 py-2.5">
          {canManage && review.status === "pending" && (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                onClick={handleOpenApprove}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-red-700 border-red-200 hover:bg-red-50"
                onClick={handleOpenReject}
              >
                Reject
              </Button>
            </div>
          )}
        </td>
      </tr>
      {approveOpen && <ApproveDialog review={review} onClose={handleCloseApprove} />}
      {rejectOpen && <RejectDialog review={review} onClose={handleCloseReject} />}
    </>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="divide-y divide-border/60">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-16 hidden sm:block" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24 hidden md:block ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReviewsPage() {
  const canView = useCan("kb:reviews:view");
  const canManage = useCan("kb:reviews:manage");

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

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

  if (!canView) {
    return (
      <PageWrapper title="Reviews">
        <EmptyState
          illustration={<KbLockIcon className="h-8 w-8 text-muted-foreground/40" />}
          title="Access restricted"
          description="You don't have permission to view knowledge base reviews."
        />
      </PageWrapper>
    );
  }

  const filters = (
    <>
      <Select value={statusFilter} onValueChange={handleStatusChange}>
        <SelectTrigger className="h-8 text-xs w-[130px]">
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
        <SelectTrigger className="h-8 text-xs w-[130px]">
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
    <PageWrapper
      title="Reviews"
      badge={reviews.length > 0 ? String(reviews.length) : undefined}
      filters={filters}
    >
      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <EmptyState
          illustration={<KbAlertCircleIcon className="h-8 w-8 text-muted-foreground/40" />}
          title="Failed to load reviews"
          description="An error occurred while fetching reviews."
        />
      ) : reviews.length === 0 ? (
        <EmptyState
          illustration={<KbClipboardCheckIcon className="h-8 w-8 text-muted-foreground/40" />}
          title="No reviews"
          description={
            statusFilter !== "all" || typeFilter !== "all"
              ? "No reviews match the current filters."
              : "No pages are currently under review."
          }
        />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                    Page
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">
                    Type
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">
                    Reviewer
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">
                    Due date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">
                    Requested by
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <ReviewRow key={review.id} review={review} canManage={canManage} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
