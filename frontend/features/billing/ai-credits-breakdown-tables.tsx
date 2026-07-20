"use client";

import { type ReactNode } from "react";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCredits, formatTokens, formatUsd } from "@/lib/format-ai";
import type { AiCreditsUsageByModel, AiCreditsUsageByFeature } from "@/hooks/api/ai-credits";

const MODEL_COLUMNS: DataTableColumn<AiCreditsUsageByModel>[] = [
  {
    key: "model",
    header: "Model",
    cell: (row): ReactNode => (
      <TruncatedText text={row.model} className="text-xs font-medium text-foreground" />
    ),
  },
  {
    key: "requests",
    header: "Requests",
    headerClassName: "text-right",
    className: "text-right tabular-nums text-xs text-muted-foreground",
    cell: (row): ReactNode => row.requests.toLocaleString(),
  },
  {
    key: "promptTokens",
    header: "In",
    headerClassName: "text-right",
    className: "text-right tabular-nums text-xs text-muted-foreground",
    cell: (row): ReactNode => formatTokens(row.promptTokens),
  },
  {
    key: "completionTokens",
    header: "Out",
    headerClassName: "text-right",
    className: "text-right tabular-nums text-xs text-muted-foreground",
    cell: (row): ReactNode => formatTokens(row.completionTokens),
  },
  {
    key: "totalTokens",
    header: "Total",
    headerClassName: "text-right",
    className: "text-right tabular-nums text-xs text-muted-foreground",
    cell: (row): ReactNode => formatTokens(row.totalTokens),
  },
  {
    key: "credits",
    header: "Credits",
    headerClassName: "text-right",
    className: "text-right tabular-nums text-xs font-medium text-foreground",
    cell: (row): ReactNode => formatCredits(row.credits),
  },
  {
    key: "costUsd",
    header: "Provider Cost",
    headerClassName: "text-right",
    className: "text-right tabular-nums text-xs text-muted-foreground",
    cell: (row): ReactNode => formatUsd(row.costUsd),
  },
];

const FEATURE_COLUMNS: DataTableColumn<AiCreditsUsageByFeature>[] = [
  {
    key: "feature",
    header: "Feature",
    cell: (row): ReactNode => (
      <TruncatedText text={row.feature} className="text-xs font-medium text-foreground" />
    ),
  },
  {
    key: "requests",
    header: "Requests",
    headerClassName: "text-right",
    className: "text-right tabular-nums text-xs text-muted-foreground",
    cell: (row): ReactNode => row.requests.toLocaleString(),
  },
  {
    key: "totalTokens",
    header: "Tokens",
    headerClassName: "text-right",
    className: "text-right tabular-nums text-xs text-muted-foreground",
    cell: (row): ReactNode => formatTokens(row.totalTokens),
  },
  {
    key: "credits",
    header: "Credits",
    headerClassName: "text-right",
    className: "text-right tabular-nums text-xs font-medium text-foreground",
    cell: (row): ReactNode => formatCredits(row.credits),
  },
  {
    key: "costUsd",
    header: "Provider Cost",
    headerClassName: "text-right",
    className: "text-right tabular-nums text-xs text-muted-foreground",
    cell: (row): ReactNode => formatUsd(row.costUsd),
  },
];

function getModelRowKey(row: AiCreditsUsageByModel): string {
  return row.model;
}

function getFeatureRowKey(row: AiCreditsUsageByFeature): string {
  return row.feature;
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
  const sortedByModel = [...byModel].sort((a, b) => b.credits - a.credits);
  const sortedByFeature = [...byFeature].sort((a, b) => b.credits - a.credits);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">By Model</p>
        </div>
        {isLoading ? (
          <DataTableSkeleton rows={4} columns={7} />
        ) : sortedByModel.length === 0 ? (
          <EmptyState
            illustrationPreset="report"
            compact
            title="No model data"
            description="Usage will appear here once AI features are used."
            className="border-0 bg-transparent py-6"
          />
        ) : (
          <DataTable
            data={sortedByModel}
            columns={MODEL_COLUMNS}
            getRowKey={getModelRowKey}
            className="rounded-none border-0"
          />
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">By Feature</p>
        </div>
        {isLoading ? (
          <DataTableSkeleton rows={4} columns={5} />
        ) : sortedByFeature.length === 0 ? (
          <EmptyState
            illustrationPreset="report"
            compact
            title="No feature data"
            description="Usage will appear here once AI features are used."
            className="border-0 bg-transparent py-6"
          />
        ) : (
          <DataTable
            data={sortedByFeature}
            columns={FEATURE_COLUMNS}
            getRowKey={getFeatureRowKey}
            className="rounded-none border-0"
          />
        )}
      </div>
    </div>
  );
}
