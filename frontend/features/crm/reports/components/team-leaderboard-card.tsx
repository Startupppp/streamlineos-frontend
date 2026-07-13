import { useMemo } from "react";
import { Trophy } from "lucide-react";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import type { SalesLeaderboardEntry } from "@/types/leads";
import { formatCurrency } from "../lib/types";

interface TeamLeaderboardCardProps {
  leaderboard: SalesLeaderboardEntry[] | undefined;
  isLoading: boolean;
}

type RankedEntry = SalesLeaderboardEntry & { rank: number };

const columns: DataTableColumn<RankedEntry>[] = [
  {
    key: "rank",
    header: "Rank",
    headerClassName: "w-10",
    cell: (row) => (
      <span
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
          row.rank === 1 && "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
          row.rank === 2 && "bg-muted text-muted-foreground",
          row.rank === 3 && "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300",
          row.rank > 3 && "text-muted-foreground",
        )}
      >
        {row.rank}
      </span>
    ),
  },
  {
    key: "name",
    header: "Name",
    sortable: true,
    sortValue: (row) => row.name,
    cell: (row) => <span className="text-[11px] font-medium">{row.name}</span>,
  },
  {
    key: "leadsAssigned",
    header: "Leads",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => (
      <span className="text-[11px] font-mono tabular-nums">{row.leadsAssigned}</span>
    ),
  },
  {
    key: "leadsConverted",
    header: "Converted",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => (
      <span className="text-[11px] font-mono tabular-nums text-emerald-600">
        {row.leadsConverted}
      </span>
    ),
  },
  {
    key: "totalRevenue",
    header: "Revenue",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => (
      <span className="text-[11px] font-mono tabular-nums">
        {formatCurrency(row.totalRevenue)}
      </span>
    ),
  },
  {
    key: "convRate",
    header: "Conv. Rate",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => {
      const convRate =
        row.leadsAssigned > 0
          ? ((row.leadsConverted / row.leadsAssigned) * 100).toFixed(1)
          : "0.0";
      return (
        <span
          className={cn(
            "text-[11px] font-medium",
            Number(convRate) >= 50
              ? "text-emerald-600"
              : Number(convRate) >= 25
                ? "text-amber-600"
                : "text-muted-foreground",
          )}
        >
          {convRate}%
        </span>
      );
    },
  },
];

export function TeamLeaderboardCard({
  leaderboard,
  isLoading,
}: TeamLeaderboardCardProps) {
  const rankedLeaderboard = useMemo(
    () => (leaderboard ?? []).map((rep, i) => ({ ...rep, rank: i + 1 })),
    [leaderboard],
  );

  return (
    <Card className="rounded-lg border border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          Team Leaderboard
        </CardTitle>
      </CardHeader>
      <DataTable
        data={rankedLeaderboard}
        columns={columns}
        getRowKey={(row) => row.userId}
        isLoading={isLoading}
        emptyState={
          <ChartEmptyState message="No team data available" compact className="py-10 px-4" />
        }
      />
    </Card>
  );
}
