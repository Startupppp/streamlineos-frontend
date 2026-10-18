"use client";

import { useMemo, type ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCredits, formatTokens } from "@/lib/format-ai";
import type { AiCreditsUsageDaily } from "@/hooks/api/ai-credits";
import { cn } from "@/lib/utils";

const DAILY_COLUMNS: DataTableColumn<AiCreditsUsageDaily>[] = [
  {
    key: "date",
    header: "Date",
    cell: (row): ReactNode => (
      <span className="text-xs font-medium text-foreground">
        {format(parseISO(row.date), "MMM d, yyyy")}
      </span>
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
];

function getDailyRowKey(row: AiCreditsUsageDaily): string {
  return row.date;
}

interface AiCreditsDailyTableProps {
  data: AiCreditsUsageDaily[];
  isLoading?: boolean;
  className?: string;
}

export function AiCreditsDailyTable({ data, isLoading, className }: AiCreditsDailyTableProps) {
  const sorted = useMemo(
    () => [...data].sort((a, b) => b.date.localeCompare(a.date)),
    [data],
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card",
        className,
      )}
    >
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">Daily usage</p>
      </div>
      {isLoading ? (
        <DataTableSkeleton rows={7} columns={4} className="rounded-none border-0" />
      ) : sorted.length === 0 ? (
        <EmptyState
          illustrationPreset="report"
          compact
          title="No daily usage"
          description="Usage will appear here once AI features are used."
          className="border-0 bg-transparent py-6"
        />
      ) : (
        <DataTable
          data={sorted}
          columns={DAILY_COLUMNS}
          getRowKey={getDailyRowKey}
          className="rounded-none border-0"
        />
      )}
    </div>
  );
}
