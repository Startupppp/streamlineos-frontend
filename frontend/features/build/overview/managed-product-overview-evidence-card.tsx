"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ManagedProductSummary } from "@/hooks/api/build/managed-product-summary";
import { statusToneClasses } from "@/lib/design-tokens";
import { formatRelativeTime } from "@/lib/date-utils";
import {
  OverviewFact,
  OverviewMeter,
  OverviewPanel,
  OverviewRecordLink,
  OverviewSectionLink,
  OverviewSegmentedBar,
} from "./overview-metric";
import { percentOf } from "./overview-signals";

interface EvidenceCardProps {
  managedProductId: number;
  evidence: ManagedProductSummary["evidence"];
  previews: ManagedProductSummary["previews"];
  ret?: string;
}

const STATE_FILL: Readonly<Record<string, string>> = {
  accepted: statusToneClasses("success").fill,
  declined: statusToneClasses("danger").fill,
  validating: statusToneClasses("warning").fill,
  exploring: statusToneClasses("info").fill,
};

function freshnessLabel(isoDate: string | null): string {
  if (!isoDate) return "Unknown";
  return formatRelativeTime(isoDate) || isoDate.slice(0, 10);
}

function readableState(state: string): string {
  const text = state.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function ManagedProductOverviewEvidenceCard({
  managedProductId,
  evidence,
  previews,
  ret,
}: EvidenceCardProps) {
  const base = `/build/managed-products/${managedProductId}`;
  const retSuffix = ret ? `?ret=${ret}` : "";
  const themedPct = percentOf(evidence.themedCount, evidence.feedbackCount);
  const last30dHref = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    return `${base}/feedback?from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`;
  }, [base]);
  const stateSegments = useMemo(
    () => Object.entries(evidence.opportunitiesByState).map(([state, count]) => ({
      id: state,
      label: readableState(state),
      value: count,
      fillClassName: STATE_FILL[state] ?? "bg-primary",
    })),
    [evidence.opportunitiesByState],
  );
  const topThemeCount = previews.themes.reduce((max, theme) => Math.max(max, theme.count), 0);

  return (
    <OverviewPanel
      title="Evidence strength"
      description="Volume, freshness and coverage of customer signal."
      action={<OverviewSectionLink href={`${base}/feedback${retSuffix}`}>View feedback</OverviewSectionLink>}
    >
      <dl>
        <OverviewFact label="Total feedback" href={`${base}/feedback${retSuffix}`}>{evidence.feedbackCount}</OverviewFact>
        <OverviewFact label="Last 30 days" href={`${last30dHref}${ret ? `&ret=${ret}` : ""}`}>{evidence.feedbackLast30d}</OverviewFact>
        <OverviewFact label="Themed">{themedPct !== null ? `${themedPct}%` : "Unknown"}</OverviewFact>
        <OverviewFact label="Latest feedback">{freshnessLabel(evidence.latestFeedbackAt)}</OverviewFact>
        <OverviewFact label="Opportunities" href={`${base}/insights${retSuffix}`}>{evidence.opportunityCount}</OverviewFact>
      </dl>

      {stateSegments.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">Opportunities by state</p>
          <OverviewSegmentedBar label="Opportunities by state" segments={stateSegments} />
        </div>
      ) : null}

      {previews.themes.length > 0 ? (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground">Top themes</p>
          <ul className="flex flex-col">
            {previews.themes.map((theme) => (
              <li key={theme.theme}>
                <Link
                  href={`${base}/feedback?theme=${encodeURIComponent(theme.theme)}${ret ? `&ret=${ret}` : ""}`}
                  className="group flex min-h-11 flex-col justify-center gap-1.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate transition-colors group-hover:text-primary">{theme.theme}</span>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">{theme.count}</span>
                  </span>
                  <OverviewMeter
                    label={`${theme.theme} share`}
                    percent={topThemeCount > 0 ? (theme.count / topThemeCount) * 100 : 0}
                    className="h-1"
                    fillClassName="bg-primary/70"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {previews.opportunities.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Top opportunities</p>
          {previews.opportunities.map((opportunity) => (
            <OverviewRecordLink
              key={opportunity.id}
              href={`${base}/insights?opportunity=${opportunity.id}${ret ? `&ret=${ret}` : ""}`}
              title={opportunity.title}
              trailing={
                <>
                  <span className="text-xs text-muted-foreground">{readableState(opportunity.state)}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">{opportunity.scoreLabel}</span>
                </>
              }
            />
          ))}
        </div>
      ) : null}
    </OverviewPanel>
  );
}
