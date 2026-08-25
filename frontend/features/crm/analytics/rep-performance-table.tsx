"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { AnalyticsChartCard } from "./analytics-chart-card";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";

interface RepEntry {
  userId: string;
  name: string;
  leadsAssigned: number;
  leadsConverted: number;
  totalCalls: number;
  score: number;
}

type RankedRepEntry = RepEntry & { rank: number };

interface RepPerformanceTableProps {
  leaderboard: RepEntry[] | undefined;
}

const columns: DataTableColumn<RankedRepEntry>[] = [
  {
    key: "rep",
    header: "Rep",
    cell: (row) => (
      <span className="text-dense font-medium flex items-center min-w-0">
        <span className="mr-1.5 text-muted-foreground shrink-0">{row.rank}.</span>
        <TruncatedText text={row.name} className="max-w-[120px]" />
      </span>
    ),
  },
  {
    key: "leadsAssigned",
    header: "Leads",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => (
      <span className="text-dense font-mono tabular-nums">{row.leadsAssigned}</span>
    ),
  },
  {
    key: "leadsConverted",
    header: "Converted",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => (
      <span className="text-dense font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
        {row.leadsConverted}
      </span>
    ),
  },
  {
    key: "totalCalls",
    header: "Calls",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => (
      <span className="text-dense font-mono tabular-nums">{row.totalCalls}</span>
    ),
  },
  {
    key: "score",
    header: "Score",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => (
      <span className="text-dense font-mono tabular-nums font-semibold">{row.score}</span>
    ),
  },
];

export function RepPerformanceTable({ leaderboard }: RepPerformanceTableProps) {
  const rankedData = (leaderboard ?? []).map((l, i) => ({ ...l, rank: i + 1 }));

  const chartData = (leaderboard ?? []).map((l) => ({
    name: l.name,
    score: l.score,
    converted: l.leadsConverted,
    calls: l.totalCalls,
  }));

  return (
    <AnalyticsChartCard title="Rep Performance" data={chartData} filename="rep-performance">
      {!leaderboard || leaderboard.length === 0 ? (
        <ChartEmptyState height={220} compact />
      ) : (
        <DataTable
          data={rankedData}
          columns={columns}
          getRowKey={(row) => row.userId}
          emptyState={<ChartEmptyState height={220} compact />}
        />
      )}
    </AnalyticsChartCard>
  );
}
