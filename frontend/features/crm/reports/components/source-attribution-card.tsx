import { Activity } from "lucide-react";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import { formatCurrency, type LeadSourceReport } from "../lib/types";

interface SourceAttributionCardProps {
  sourceReport: LeadSourceReport | undefined;
  isLoading: boolean;
}

type SourceRow = NonNullable<LeadSourceReport["sources"]>[number];

const columns: DataTableColumn<SourceRow>[] = [
  {
    key: "source",
    header: "Source",
    cell: (row) => (
      <span className="text-dense font-medium capitalize">
        {row.source.replace(/_/g, " ")}
      </span>
    ),
  },
  {
    key: "count",
    header: "Leads",
    sortable: true,
    sortValue: (row) => row.count,
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => (
      <span className="text-dense font-mono tabular-nums">{row.count}</span>
    ),
  },
  {
    key: "converted",
    header: "Converted",
    sortable: true,
    sortValue: (row) => row.converted,
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => (
      <span className="text-dense font-mono tabular-nums text-status-success-ink">
        {row.converted}
      </span>
    ),
  },
  {
    key: "conversionRate",
    header: "Win Rate",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => (
      <span
        className={cn(
          "text-dense font-mono tabular-nums font-medium",
          row.conversionRate >= 50
            ? "text-status-success-ink"
            : row.conversionRate >= 25
              ? "text-status-warning-ink"
              : "text-muted-foreground",
        )}
      >
        {row.conversionRate.toFixed(1)}%
      </span>
    ),
  },
  {
    key: "avgValue",
    header: "Avg Value",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => (
      <span className="text-dense font-mono tabular-nums text-muted-foreground">
        {row.count > 0
          ? formatCurrency(Math.round(row.totalValue / row.count))
          : "—"}
      </span>
    ),
  },
];

export function SourceAttributionCard({
  sourceReport,
  isLoading,
}: SourceAttributionCardProps) {
  return (
    <Card className="rounded-lg border border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Source Attribution
        </CardTitle>
      </CardHeader>
      <DataTable
        data={sourceReport?.sources ?? []}
        columns={columns}
        getRowKey={(row) => row.source}
        isLoading={isLoading}
        emptyState={
          <ChartEmptyState message="No source data available" compact className="py-10 px-4" />
        }
      />
    </Card>
  );
}
