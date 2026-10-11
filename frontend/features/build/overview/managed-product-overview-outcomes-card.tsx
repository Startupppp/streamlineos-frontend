"use client";

import type { ManagedProductSummary } from "@/hooks/api/build/managed-product-summary";
import { formatRelativeTime } from "@/lib/date-utils";
import { OverviewFact, OverviewSectionLink } from "./overview-metric";

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
    <section className="min-w-0 rounded-xl border border-border bg-card px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Measured outcomes</h2>
        <OverviewSectionLink href={`/build/managed-products/${managedProductId}/goals`}>
          View goals
        </OverviewSectionLink>
      </div>
      <dl className="mt-1 grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8">
        <OverviewFact label="Goals linked">{goalsLinked}</OverviewFact>
        <OverviewFact label="Reviews scheduled">{outcomeReviews.scheduled}</OverviewFact>
        <OverviewFact label="Completed">{outcomeReviews.completed}</OverviewFact>
        <OverviewFact label="Met / not met">
          {hasReviews ? `${outcomeReviews.met} / ${outcomeReviews.notMet}` : "Not measured yet"}
        </OverviewFact>
        <OverviewFact label="Latest review">{reviewFreshnessLabel(latestReviewAt)}</OverviewFact>
      </dl>
    </section>
  );
}
