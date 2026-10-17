"use client";

import { memo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrustBadge } from "@/features/wiki/components/kb-collection-badges";
import type { KbPageReview, KbReviewStatus, KbReviewType } from "@/hooks/api/kb/page-reviews";
import { pageHref } from "@/lib/knowledge-routes";
import { kbFormatDate } from "@/features/wiki/lib/kb-date-utils";
import { KbAlertCircleIcon, KbCheckCircleIcon, KbXCircleIcon } from "@/features/wiki/lib/kb-icons";

interface StatusBadgeProps {
  status: KbReviewStatus;
  isOverdue: boolean;
}

export function StatusBadge({ status, isOverdue }: StatusBadgeProps) {
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

interface TypeBadgeProps {
  type: KbReviewType;
}

export function TypeBadge({ type }: TypeBadgeProps) {
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

interface ReviewMobileCardProps {
  review: KbPageReview;
  canManage: boolean;
  onApprove: (review: KbPageReview) => void;
  onReject: (review: KbPageReview) => void;
}

export const ReviewMobileCard = memo(function ReviewMobileCard({
  review,
  canManage,
  onApprove,
  onReject,
}: ReviewMobileCardProps) {
  function handleApprove() {
    onApprove(review);
  }

  function handleReject() {
    onReject(review);
  }

  const title = review.pageTitle ?? "Untitled";

  return (
    <div className="flex flex-col gap-2 px-3 py-2.5">
      <Link
        href={pageHref(review.pageId)}
        className="font-medium text-foreground line-clamp-1 hover:text-accent transition-colors"
      >
        {title}
      </Link>
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge status={review.status} isOverdue={review.isOverdue} />
        <TypeBadge type={review.type} />
        {review.pageTrustState && <TrustBadge trustState={review.pageTrustState} />}
      </div>
      <span className="text-sm text-muted-foreground">
        {review.reviewerName ?? "No reviewer"}
        {review.dueAt ? ` · Due ${kbFormatDate(review.dueAt)}` : ""}
      </span>
      {canManage && review.status === "pending" && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-xs text-status-success-ink border-status-success-rule hover:bg-status-success-surface"
            onClick={handleApprove}
            aria-label={`Approve review for ${title}`}
          >
            Approve
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={handleReject}
            aria-label={`Reject review for ${title}`}
          >
            Reject
          </Button>
        </div>
      )}
    </div>
  );
});
