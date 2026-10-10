"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Lightbulb, TrendingUp } from "lucide-react";
import type { DiscoveryReviewsGetEvidenceThemesResponse } from "@/contracts/build-contracts.generated";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";

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
      <div className="bg-emerald-500 dark:bg-emerald-400" style={{ width: `${posW}%` }} />
      <div className="bg-amber-400 dark:bg-amber-300" style={{ width: `${mixW}%` }} />
      <div className="bg-red-500 dark:bg-red-400" style={{ width: `${negW}%` }} />
    </div>
  );
}

function SparklineBar({ trend }: { trend: ThemeRow["trend"] }) {
  const vals = trend.map((t) => t.count);
  const max = Math.max(...vals, 1);
  return (
    <div className="flex h-6 items-end gap-px" aria-hidden>
      {vals.slice(-8).map((v, i) => (
        <div
          key={i}
          className="w-1.5 rounded-sm bg-blue-400 dark:bg-blue-500"
          style={{ height: `${Math.max(4, (v / max) * 24)}px` }}
        />
      ))}
    </div>
  );
}

interface EvidenceThemesSectionProps {
  managedProductId: number;
  themes: ThemeRow[];
  suggestedThemes: SuggestedTheme[];
  period: string;
  onPeriodChange: (value: string) => void;
}

export function EvidenceThemesSection({
  managedProductId,
  themes,
  suggestedThemes,
  period,
  onPeriodChange,
}: EvidenceThemesSectionProps) {
  const sortedThemes = useMemo(
    () => [...themes].sort((a, b) => b.count - a.count),
    [themes],
  );

  return (
    <section aria-labelledby="evidence-themes-heading" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-muted-foreground" aria-hidden />
          <h2 id="evidence-themes-heading" className="text-sm font-semibold text-foreground">
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

      {sortedThemes.length > 0 && (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-medium text-muted-foreground">
                <th className="px-4 py-2 text-left">Theme</th>
                <th className="px-4 py-2 text-right tabular-nums font-mono">Count</th>
                <th className="px-4 py-2 text-left">Sentiment</th>
                <th className="px-4 py-2 text-right tabular-nums font-mono">Opportunities</th>
                <th className="px-4 py-2 text-left">Weekly trend</th>
              </tr>
            </thead>
            <tbody>
              {sortedThemes.map((row) => (
                <tr key={row.theme ?? "__null"} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-2 font-medium text-foreground">
                    {row.theme ?? <span className="text-muted-foreground italic">Unthemed</span>}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-mono">{row.count}</td>
                  <td className="px-4 py-2">
                    <SentimentBar breakdown={row.sentimentBreakdown} />
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-mono">{row.opportunityCount}</td>
                  <td className="px-4 py-2">
                    <SparklineBar trend={row.trend} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sortedThemes.length === 0 && (
        <p className="text-sm text-muted-foreground">No evidence themes for this period.</p>
      )}

      {suggestedThemes.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-1.5">
            <Lightbulb className="size-4 text-amber-500" aria-hidden />
            <span className="text-sm font-semibold text-foreground" data-testid="ai-suggestions-label">
              AI suggestions
            </span>
            <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              Suggestions
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Patterns identified by AI. These are suggestions only — review before acting on them.
          </p>
          <ul className="space-y-2">
            {suggestedThemes.map((s) => (
              <li key={s.label} className="flex items-start justify-between gap-4" data-testid="ai-suggestion-item">
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
                        className="text-xs text-blue-600 hover:underline dark:text-blue-400"
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
