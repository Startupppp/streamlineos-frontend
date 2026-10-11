"use client";

import { Badge } from "@/components/ui/badge";
import type { ManagedProductSummary } from "@/hooks/api/build/managed-product-summary";
import { formatRelativeTime } from "@/lib/date-utils";
import { OverviewFact, OverviewRecordLink, OverviewSectionLink } from "./overview-metric";

interface EvidenceCardProps {
  managedProductId: number;
  evidence: ManagedProductSummary["evidence"];
  previews: ManagedProductSummary["previews"];
}

function freshnessLabel(isoDate: string | null): string {
  if (!isoDate) return "Unknown";
  return formatRelativeTime(isoDate) || isoDate.slice(0, 10);
}

export function ManagedProductOverviewEvidenceCard({
  managedProductId,
  evidence,
  previews,
}: EvidenceCardProps) {
  const themedPct =
    evidence.feedbackCount > 0
      ? Math.round((evidence.themedCount / evidence.feedbackCount) * 100)
      : null;

  return (
    <section className="min-w-0 rounded-xl border border-border bg-card px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Evidence strength</h2>
        <OverviewSectionLink href={`/build/managed-products/${managedProductId}/feedback`}>
          View feedback
        </OverviewSectionLink>
      </div>
      <dl className="mt-1">
        <OverviewFact label="Total feedback">{evidence.feedbackCount}</OverviewFact>
        <OverviewFact label="Last 30 days">{evidence.feedbackLast30d}</OverviewFact>
        <OverviewFact label="Themed">{themedPct !== null ? `${themedPct}%` : "Unknown"}</OverviewFact>
        <OverviewFact label="Latest feedback">{freshnessLabel(evidence.latestFeedbackAt)}</OverviewFact>
      </dl>

      {Object.keys(evidence.opportunitiesByState).length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-muted-foreground">Opportunities by state</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {Object.entries(evidence.opportunitiesByState).map(([state, count]) => (
              <Badge key={state} variant="secondary" className="text-xs">
                {state.replaceAll("_", " ")}: <span className="ml-1 font-mono tabular-nums">{count}</span>
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {previews.themes.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-muted-foreground">Top themes</p>
          {previews.themes.map((theme) => (
            <OverviewRecordLink
              key={theme.theme}
              href={`/build/managed-products/${managedProductId}/feedback?theme=${encodeURIComponent(theme.theme)}`}
              title={theme.theme}
              trailing={<span className="font-mono tabular-nums text-muted-foreground">{theme.count}</span>}
            />
          ))}
        </div>
      ) : null}

      {previews.opportunities.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-muted-foreground">Top opportunities</p>
          {previews.opportunities.map((opportunity) => (
            <OverviewRecordLink
              key={opportunity.id}
              href={`/build/managed-products/${managedProductId}/insights?opportunity=${opportunity.id}`}
              title={opportunity.title}
              trailing={
                <span className="font-mono tabular-nums text-muted-foreground">{opportunity.scoreLabel}</span>
              }
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
