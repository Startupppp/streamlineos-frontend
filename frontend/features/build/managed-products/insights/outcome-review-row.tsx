"use client";

import { Check, Trash2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { DiscoveryReviewsListOutcomeReviewsResponse } from "@/contracts/build-contracts.generated";

type OutcomeReview = DiscoveryReviewsListOutcomeReviewsResponse["data"][number];

function labelize(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function stateVariant(state: string) {
  if (state === "completed") return "default" as const;
  if (state === "cancelled") return "destructive" as const;
  return "secondary" as const;
}

function scheduledLabel(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function measureKindVariant(kind: string | null | undefined) {
  if (kind === "measured") return "default" as const;
  return "secondary" as const;
}

function measureKindLabel(kind: string | null | undefined) {
  if (kind === "measured") return "Measured";
  if (kind === "self_reported") return "Self-reported";
  return null;
}

function freshnessLabel(measuredAt: string | null | undefined): string | null {
  if (!measuredAt) return null;
  const date = new Date(measuredAt);
  if (Number.isNaN(date.getTime())) return null;
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days === 0) return "Measured today";
  if (days === 1) return "Measured 1 day ago";
  return `Measured ${days} days ago`;
}

function sourceRecordHref(
  managedProductId: number,
  review: OutcomeReview,
): string | null {
  if (review.opportunityId != null) {
    return `/build/managed-products/${managedProductId}/insights?view=discovery&opportunity=${review.opportunityId}`;
  }
  if (review.roadmapItemId != null) {
    return `/build/managed-products/${managedProductId}/roadmap?item=${review.roadmapItemId}`;
  }
  if (review.goalId != null) {
    return `/build/managed-products/${managedProductId}/goals?goal=${review.goalId}`;
  }
  return null;
}

export function OutcomeReviewRow({
  review,
  managedProductId,
  canWrite,
  onComplete,
  onDelete,
}: {
  review: OutcomeReview;
  managedProductId: number;
  canWrite: boolean;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const when = scheduledLabel(review.scheduledFor);
  const mkLabel = measureKindLabel(review.measureKind);
  const freshness = freshnessLabel(review.measuredAt);
  const open = review.state !== "completed" && review.state !== "cancelled";
  const sourceHref = sourceRecordHref(managedProductId, review);
  const hasMetrics = review.metric || review.baseline || review.target || review.actual;

  return (
    <li
      className="flex flex-wrap items-start gap-x-4 gap-y-3 rounded-xl border border-border bg-card p-4 shadow-sm"
      data-testid={`outcome-review-row-${review.id}`}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <p className="truncate text-sm font-semibold text-foreground">{review.title}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{labelize(review.kind)}</span>
          <Badge variant={stateVariant(review.state)}>{labelize(review.state)}</Badge>
          {review.result ? <Badge variant="outline">{labelize(review.result)}</Badge> : null}
          {mkLabel ? (
            <Badge variant={measureKindVariant(review.measureKind)} data-testid={`measure-kind-badge-${review.id}`}>
              {mkLabel}
            </Badge>
          ) : null}
          {when ? (
            <span className="text-xs tabular-nums text-muted-foreground">{when}</span>
          ) : null}
          {freshness ? (
            <span className="text-xs tabular-nums text-muted-foreground" data-testid={`freshness-${review.id}`}>
              {freshness}
            </span>
          ) : null}
          {sourceHref ? (
            <a
              href={sourceHref}
              className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2"
              data-testid={`source-record-link-${review.id}`}
            >
              <ExternalLink className="size-3" aria-hidden />
              Source record
            </a>
          ) : review.sourceUrl ? (
            <a
              href={review.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2"
              data-testid={`source-url-link-${review.id}`}
            >
              <ExternalLink className="size-3" aria-hidden />
              Source
            </a>
          ) : null}
        </div>
        {hasMetrics ? (
          <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4" data-testid={`metrics-${review.id}`}>
            {review.metric ? (
              <>
                <dt className="text-muted-foreground">Metric</dt>
                <dd className="col-span-3 font-medium text-foreground sm:col-span-1">
                  {review.metric}{review.unit ? ` (${review.unit})` : ""}
                </dd>
              </>
            ) : null}
            {review.baseline != null ? (
              <>
                <dt className="text-muted-foreground">Baseline</dt>
                <dd className="font-mono tabular-nums text-foreground">{review.baseline}</dd>
              </>
            ) : null}
            {review.target != null ? (
              <>
                <dt className="text-muted-foreground">Target</dt>
                <dd className="font-mono tabular-nums text-foreground">{review.target}</dd>
              </>
            ) : null}
            {review.actual != null ? (
              <>
                <dt className="text-muted-foreground">Actual</dt>
                <dd className="font-mono tabular-nums text-foreground" data-testid={`actual-${review.id}`}>
                  {review.actual}
                </dd>
              </>
            ) : null}
          </dl>
        ) : null}
      </div>
      {canWrite ? (
        <div className="flex shrink-0 items-center gap-2">
          {open ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onComplete}
              data-testid={`complete-review-btn-${review.id}`}
            >
              <Check className="size-3.5" aria-hidden />
              Complete
            </Button>
          ) : null}
          <ConfirmDialog
            title="Delete review?"
            description="This review will be permanently removed."
            confirmLabel="Delete"
            destructive
            onConfirm={onDelete}
            trigger={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                data-testid={`delete-review-btn-${review.id}`}
              >
                <Trash2 className="size-3.5" aria-hidden />
                Delete
              </Button>
            }
          />
        </div>
      ) : null}
    </li>
  );
}
