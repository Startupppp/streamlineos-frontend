"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/date-utils";
import type { ManagedProductSummary } from "@/hooks/api/build/managed-product-summary";

interface OutcomesCardProps {
  managedProductId: number;
  outcomes: ManagedProductSummary["outcomes"];
}

function reviewFreshnessLabel(isoDate: string | null): string {
  if (!isoDate) return "Not measured yet";
  return formatRelativeTime(isoDate) || isoDate.slice(0, 10);
}

export function ManagedProductOverviewOutcomesCard({
  managedProductId,
  outcomes,
}: OutcomesCardProps) {
  const { goalsLinked, outcomeReviews, latestReviewAt } = outcomes;
  const hasReviews = outcomeReviews.completed > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Measured outcomes</h2>
          <Link
            href={`/build/managed-products/${managedProductId}/goals`}
            className="text-xs text-primary underline-offset-2 hover:underline"
          >
            View goals
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Goals linked</span>
            <p className="font-mono text-lg font-semibold tabular-nums">{goalsLinked}</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Reviews scheduled</span>
            <p className="font-mono text-lg font-semibold tabular-nums">
              {outcomeReviews.scheduled}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Completed</span>
            <p className="font-mono text-lg font-semibold tabular-nums">
              {outcomeReviews.completed}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Met / not met</span>
            <p className="font-mono tabular-nums">
              {hasReviews
                ? `${outcomeReviews.met} / ${outcomeReviews.notMet}`
                : "Not measured yet"}
            </p>
          </div>
        </div>

        <div className="space-y-0.5">
          <span className="text-xs text-muted-foreground">Latest review</span>
          <p className="text-sm">{reviewFreshnessLabel(latestReviewAt)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
