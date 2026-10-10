"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/date-utils";
import type { ManagedProductSummary } from "@/hooks/api/build/managed-product-summary";

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
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Evidence strength</h2>
          <Link
            href={`/build/managed-products/${managedProductId}/feedback`}
            className="text-xs text-primary underline-offset-2 hover:underline"
          >
            View feedback
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Total feedback</span>
            <p className="font-mono text-lg font-semibold tabular-nums">{evidence.feedbackCount}</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Last 30 days</span>
            <p className="font-mono text-lg font-semibold tabular-nums">{evidence.feedbackLast30d}</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Themed</span>
            <p className="font-mono text-lg font-semibold tabular-nums">
              {themedPct !== null ? `${themedPct}%` : "Unknown"}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Latest feedback</span>
            <p className="text-sm">{freshnessLabel(evidence.latestFeedbackAt)}</p>
          </div>
        </div>

        {Object.keys(evidence.opportunitiesByState).length > 0 && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Opportunities by state</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(evidence.opportunitiesByState).map(([state, count]) => (
                <Badge key={state} variant="secondary" className="text-xs">
                  {state}: <span className="ml-1 font-mono tabular-nums">{count}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {previews.themes.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Top themes</span>
            <div className="space-y-1">
              {previews.themes.map((t) => (
                <Link
                  key={t.theme}
                  href={`/build/managed-products/${managedProductId}/feedback?theme=${encodeURIComponent(t.theme)}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm hover:border-primary/40"
                >
                  <span className="truncate">{t.theme}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">{t.count}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {previews.opportunities.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Top opportunities</span>
            <div className="space-y-1">
              {previews.opportunities.map((opp) => (
                <Link
                  key={opp.id}
                  href={`/build/managed-products/${managedProductId}/insights?opportunity=${opp.id}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm hover:border-primary/40"
                >
                  <span className="truncate">{opp.title}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">{opp.scoreLabel}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
