"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CircleCheckIcon } from "@animateicons/react/lucide";
import type { ManagedProductSummary } from "@/hooks/api/build/managed-product-summary";
import { statusToneClasses } from "@/lib/design-tokens";
import { formatRelativeTime } from "@/lib/date-utils";
import { OverviewFact, OverviewMeter, OverviewPanel, OverviewSectionLink, OverviewSegmentedBar } from "./overview-metric";

interface OutcomesCardProps {
  managedProductId: number;
  outcomes: ManagedProductSummary["outcomes"];
  goals: ManagedProductSummary["previews"]["goals"];
}

function reviewFreshnessLabel(isoDate: string | null): string {
  if (!isoDate) return "Not measured yet";
  return formatRelativeTime(isoDate) || isoDate.slice(0, 10);
}

export function ManagedProductOverviewOutcomesCard({
  managedProductId,
  outcomes,
  goals,
}: OutcomesCardProps) {
  const { goalsLinked, outcomeReviews, latestReviewAt } = outcomes;
  const hasReviews = outcomeReviews.completed > 0;
  const partial = Math.max(0, outcomeReviews.completed - outcomeReviews.met - outcomeReviews.notMet);
  const reviewSegments = useMemo(
    () => [
      { id: "met", label: "Met", value: outcomeReviews.met, fillClassName: statusToneClasses("success").fill },
      { id: "partial", label: "Partial", value: partial, fillClassName: statusToneClasses("warning").fill },
      { id: "missed", label: "Missed", value: outcomeReviews.notMet, fillClassName: statusToneClasses("danger").fill },
    ],
    [outcomeReviews.met, partial, outcomeReviews.notMet],
  );

  return (
    <OverviewPanel
      title="Measured outcomes"
      description="Did shipped work move the metrics it promised to?"
      action={<OverviewSectionLink href={`/build/managed-products/${managedProductId}/goals`} icon={CircleCheckIcon}>View goals</OverviewSectionLink>}
    >
      {hasReviews ? (
        <OverviewSegmentedBar
          label="Outcome review results"
          segments={reviewSegments}
        />
      ) : null}
      <dl className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8">
        <OverviewFact label="Goals linked" href={`/build/managed-products/${managedProductId}/goals`}>{goalsLinked}</OverviewFact>
        <OverviewFact label="Reviews scheduled">{outcomeReviews.scheduled}</OverviewFact>
        <OverviewFact label="Completed">{outcomeReviews.completed}</OverviewFact>
        <OverviewFact label="Met / not met">
          {hasReviews ? `${outcomeReviews.met} / ${outcomeReviews.notMet}` : "Not measured yet"}
        </OverviewFact>
        <OverviewFact label="Latest review" className="sm:col-span-2">
          {reviewFreshnessLabel(latestReviewAt)}
        </OverviewFact>
      </dl>
      {goals.length > 0 ? (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground">Linked goals</p>
          <ul className="flex flex-col">
            {goals.map((goal) => (
              <li key={goal.id}>
                <Link
                  href={`/build/goals/${goal.id}`}
                  className="group flex min-h-11 flex-col justify-center gap-1.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate transition-colors group-hover:text-primary">{goal.title}</span>
                    <span className="flex shrink-0 items-baseline gap-2">
                      <span className="text-xs text-muted-foreground">{goal.status.replaceAll("_", " ")}</span>
                      <span className="font-mono text-xs tabular-nums">{goal.progress}%</span>
                    </span>
                  </span>
                  <OverviewMeter label={`${goal.title} progress`} percent={goal.progress} className="h-1" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </OverviewPanel>
  );
}
