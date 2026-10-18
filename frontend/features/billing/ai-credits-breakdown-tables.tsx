"use client";

import { useMemo } from "react";
import { TruncatedText } from "@/components/ui/truncated-text";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCredits, formatTokens, formatUsd } from "@/lib/format-ai";
import type { AiCreditsUsageByModel, AiCreditsUsageByFeature } from "@/hooks/api/ai-credits";

interface ShareRow {
  key: string;
  label: string;
  detail: string;
  credits: number;
}

function shareWidth(credits: number, peak: number): string {
  if (peak <= 0 || credits <= 0) return "0%";
  const share = Math.round((credits / peak) * 100);
  return `${Math.max(share, 4)}%`;
}

function BreakdownSkeleton() {
  return (
    <div>
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-1 w-full" />
          </div>
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}

function BreakdownPanel({
  title,
  rows,
  isLoading,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  rows: ShareRow[];
  isLoading: boolean;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const peak = rows.reduce((max, row) => Math.max(max, row.credits), 0);

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="shrink-0 border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      {isLoading ? (
        <BreakdownSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          illustrationPreset="report"
          compact
          title={emptyTitle}
          description={emptyDescription}
          className="flex-1 border-0 bg-transparent py-6"
        />
      ) : (
        <ul className="flex-1">
          {rows.map((row) => (
            <li
              key={row.key}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-4 py-3 last:border-b-0"
            >
              <div className="flex min-w-0 flex-col gap-1.5">
                <TruncatedText text={row.label} className="text-sm font-medium text-foreground" />
                <p className="truncate text-xs tabular-nums text-muted-foreground" title={row.detail}>
                  {row.detail}
                </p>
                <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: shareWidth(row.credits, peak) }}
                  />
                </div>
              </div>
              <p className="text-sm font-semibold tabular-nums text-foreground">
                {formatCredits(row.credits)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">cr</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface AiCreditsBreakdownTablesProps {
  byModel: AiCreditsUsageByModel[];
  byFeature: AiCreditsUsageByFeature[];
  isLoading: boolean;
}

export function AiCreditsBreakdownTables({
  byModel,
  byFeature,
  isLoading,
}: AiCreditsBreakdownTablesProps) {
  const modelRows = useMemo<ShareRow[]>(
    () =>
      [...byModel]
        .sort((a, b) => b.credits - a.credits)
        .map((row) => ({
          key: row.model,
          label: row.model,
          detail: `${row.requests.toLocaleString()} requests · ${formatTokens(row.promptTokens)} in · ${formatTokens(row.completionTokens)} out · ${formatUsd(row.costUsd)}`,
          credits: row.credits,
        })),
    [byModel],
  );

  const featureRows = useMemo<ShareRow[]>(
    () =>
      [...byFeature]
        .sort((a, b) => b.credits - a.credits)
        .map((row) => ({
          key: row.feature,
          label: row.feature,
          detail: `${row.requests.toLocaleString()} requests · ${formatTokens(row.totalTokens)} tokens · ${formatUsd(row.costUsd)}`,
          credits: row.credits,
        })),
    [byFeature],
  );

  return (
    <div className="grid shrink-0 gap-4 md:grid-cols-2 md:items-stretch">
      <BreakdownPanel
        title="By model"
        rows={modelRows}
        isLoading={isLoading}
        emptyTitle="No model data"
        emptyDescription="Usage will appear here once AI features are used."
      />
      <BreakdownPanel
        title="By feature"
        rows={featureRows}
        isLoading={isLoading}
        emptyTitle="No feature data"
        emptyDescription="Usage will appear here once AI features are used."
      />
    </div>
  );
}
