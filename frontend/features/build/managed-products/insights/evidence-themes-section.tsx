"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Lightbulb, TrendingUp } from "lucide-react";
import type { DiscoveryReviewsGetEvidenceThemesResponse } from "@/contracts/build-contracts.generated";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";

const TrendBar = dynamic(
  () => import("./evidence-trend-bar").then((m) => m.TrendBar),
  { ssr: false, loading: () => <Skeleton className="h-6 w-20 rounded" /> },
);

const PERIOD_OPTIONS = [
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "Last 365 days", value: "365d" },
  { label: "All time", value: "all" },
];

type ThemeRow = DiscoveryReviewsGetEvidenceThemesResponse["themes"][number];
type SuggestedTheme = DiscoveryReviewsGetEvidenceThemesResponse["suggestedThemes"][number];

function SentimentBar({ breakdown }: { breakdown: ThemeRow["sentimentBreakdown"] }) {
  const total = breakdown.positive + breakdown.neutral + breakdown.negative + breakdown.mixed;
  if (total === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const posW = (breakdown.positive / total) * 100;
  const negW = (breakdown.negative / total) * 100;
  const mixW = (breakdown.mixed / total) * 100;
  return (
    <div className="flex h-2 w-20 overflow-hidden rounded-full bg-muted" title={`+${breakdown.positive} ~${breakdown.neutral} -${breakdown.negative}`}>
      <div className="bg-status-success-fill" style={{ width: `${posW}%` }} />
      <div className="bg-status-warning-fill" style={{ width: `${mixW}%` }} />
      <div className="bg-status-danger-fill" style={{ width: `${negW}%` }} />
    </div>
  );
}

interface EvidenceThemesSectionProps {
  managedProductId: number;
  themes: ThemeRow[];
  suggestedThemes: SuggestedTheme[];
  period: string;
  onPeriodChange: (value: string) => void;
  isError?: boolean;
  onRetry?: () => void;
}

export function EvidenceThemesSection({
  managedProductId,
  themes,
  suggestedThemes,
  period,
  onPeriodChange,
  isError,
  onRetry,
}: EvidenceThemesSectionProps) {
  const sortedThemes = [...themes].sort((a, b) => b.count - a.count);

  return (
    <section aria-labelledby="evidence-themes-heading" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-muted-foreground" aria-hidden />
          <h2 id="evidence-themes-heading" className="text-base font-semibold text-foreground">
            Evidence themes
          </h2>
        </div>
        <BuildFilterSelect
          label="Period"
          value={period}
          onValueChange={onPeriodChange}
          options={PERIOD_OPTIONS}
        />
      </div>

      {isError && onRetry && (
        <ErrorState title="Could not load evidence themes" onRetry={onRetry} compact />
      )}

      {!isError && sortedThemes.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground">
                <th className="whitespace-nowrap px-4 py-2.5 text-left">Theme</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">Count</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-left">Sentiment</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">Opportunities</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-left">Weekly trend</th>
              </tr>
            </thead>
            <tbody>
              {sortedThemes.map((row) => (
                <tr key={row.theme ?? "__null"} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {row.theme ?? <span className="text-muted-foreground">Unthemed</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.count}</td>
                  <td className="px-4 py-3">
                    <SentimentBar breakdown={row.sentimentBreakdown} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.opportunityCount}</td>
                  <td className="px-4 py-3">
                    <TrendBar trend={row.trend} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isError && sortedThemes.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card px-4 py-6">
          <p className="text-sm font-medium text-foreground">No evidence themes</p>
          <p className="mt-1 text-sm text-muted-foreground">Nothing is grouped for this period.</p>
        </div>
      )}

      {!isError && suggestedThemes.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-1.5">
            <Lightbulb className="size-4 text-status-warning-ink" aria-hidden />
            <span className="text-sm font-semibold text-foreground" data-testid="ai-suggestions-label">
              AI suggestions
            </span>
            <span className="ml-1 rounded bg-status-warning-surface px-1.5 py-0.5 text-xs font-medium text-status-warning-ink-strong">
              Suggestions
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Patterns identified by AI. These are suggestions only — review before acting on them.
          </p>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {suggestedThemes.map((s) => (
              <li key={s.label} className="flex items-center justify-between gap-4 px-3 py-2.5" data-testid="ai-suggestion-item">
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground">{s.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground tabular-nums font-mono">
                    {s.count} signals
                  </span>
                </div>
                {s.citations.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {s.citations.slice(0, 3).map((submissionId) => (
                      <Link
                        key={submissionId}
                        href={`/build/managed-products/${managedProductId}/feedback?submission=${submissionId}`}
                        className="text-xs text-status-info-ink-strong hover:underline"
                        data-testid="ai-suggestion-citation"
                      >
                        #{submissionId}
                      </Link>
                    ))}
                    {s.citations.length > 3 && (
                      <span className="text-xs text-muted-foreground">+{s.citations.length - 3}</span>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
