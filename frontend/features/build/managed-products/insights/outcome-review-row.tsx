"use client";

import { Check, Trash2 } from "lucide-react";
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

export function OutcomeReviewRow({
  review,
  canWrite,
  onComplete,
  onDelete,
}: {
  review: OutcomeReview;
  canWrite: boolean;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const when = scheduledLabel(review.scheduledFor);
  const open = review.state !== "completed" && review.state !== "cancelled";

  return (
    <li
      className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-border bg-card p-4 shadow-sm"
      data-testid={`outcome-review-row-${review.id}`}
    >
      <div className="min-w-0 space-y-2">
        <p className="truncate text-sm font-semibold text-foreground">{review.title}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{labelize(review.kind)}</span>
          <Badge variant={stateVariant(review.state)}>{labelize(review.state)}</Badge>
          {review.result ? <Badge variant="outline">{labelize(review.result)}</Badge> : null}
          {when ? (
            <span className="text-xs tabular-nums text-muted-foreground">{when}</span>
          ) : null}
        </div>
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
