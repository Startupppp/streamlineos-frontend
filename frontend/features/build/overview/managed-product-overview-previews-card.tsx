"use client";

import type { ManagedProductSummary } from "@/hooks/api/build/managed-product-summary";
import { formatRelativeTime } from "@/lib/date-utils";
import { OverviewRecordLink, OverviewSectionLink } from "./overview-metric";

interface PreviewsCardProps {
  managedProductId: number;
  previews: ManagedProductSummary["previews"];
}

type ExtendedPreviews = ManagedProductSummary["previews"] & {
  goals?: Array<{ id: number; title: string; status: string; progress: number }>;
  decisions?: Array<{ id: number; title: string; decidedAt: string | null; note: string | null }>;
  changelogPublished?: number;
};

export function ManagedProductOverviewPreviewsCard({
  managedProductId,
  previews,
}: PreviewsCardProps) {
  const ext = previews as ExtendedPreviews;
  const goals = ext.goals ?? [];
  const decisions = ext.decisions ?? [];
  const changelogPublished = ext.changelogPublished ?? 0;

  const hasContent = goals.length > 0 || decisions.length > 0 || changelogPublished > 0;
  if (!hasContent) return null;

  return (
    <section className="min-w-0 rounded-xl border border-border bg-card px-4 py-4">
      <h2 className="text-sm font-semibold text-foreground">Goals, decisions & publication</h2>
      <div className="mt-3 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {goals.length > 0 ? (
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-muted-foreground">Linked goals</p>
              <OverviewSectionLink href="/build/goals">View goals</OverviewSectionLink>
            </div>
            {goals.map((goal) => (
              <OverviewRecordLink
                key={goal.id}
                href={`/build/goals/${goal.id}`}
                title={goal.title}
                trailing={
                  <>
                    <span className="text-xs text-muted-foreground">{goal.status.replaceAll("_", " ")}</span>
                    <span className="font-mono tabular-nums text-xs">{goal.progress}%</span>
                  </>
                }
              />
            ))}
          </div>
        ) : null}

        {decisions.length > 0 ? (
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-muted-foreground">Recent decisions</p>
              <OverviewSectionLink href={`/build/managed-products/${managedProductId}/roadmap`}>
                View roadmap
              </OverviewSectionLink>
            </div>
            {decisions.map((decision) => (
              <div key={decision.id} className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 break-words font-medium">{decision.title}</span>
                  {decision.decidedAt ? (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatRelativeTime(decision.decidedAt)}
                    </span>
                  ) : null}
                </div>
                {decision.note ? (
                  <p className="mt-0.5 break-words text-xs text-muted-foreground">{decision.note}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {changelogPublished > 0 ? (
        <div className="mt-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Published changelog entries</p>
            <p className="font-mono text-lg font-semibold tabular-nums">{changelogPublished}</p>
          </div>
          <OverviewSectionLink href={`/build/managed-products/${managedProductId}/roadmap`}>
            View roadmap
          </OverviewSectionLink>
        </div>
      ) : null}
    </section>
  );
}
