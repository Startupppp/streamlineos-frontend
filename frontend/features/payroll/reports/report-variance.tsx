"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyReportIllustration } from "@/components/illustrations";
import { usePayrollVariance } from "@/hooks/api/payroll/reports";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import { cn } from "@/lib/utils";
import type { VarianceEmployeeRow } from "@/types/payroll/reports";

interface ReportVarianceProps {
  month: string;
}

function formatDelta(value: number): string {
  const abs = formatMoney(Math.abs(value));
  if (value > 0) return `+${abs}`;
  if (value < 0) return `−${abs}`;
  return abs;
}

function getDeltaClass(value: number): string {
  if (value > 0) return "text-emerald-600";
  if (value < 0) return "text-red-600";
  return "text-muted-foreground";
}

const COLUMNS: DataTableColumn<VarianceEmployeeRow>[] = [
  {
    key: "name",
    header: "Name",
    cell: (row) => <span className="text-[11px] font-medium">{row.name}</span>,
  },
  {
    key: "prevGross",
    header: "Prev Gross",
    className: "text-right",
    cell: (row) => (
      <span className="font-mono text-[11px] tabular-nums">{formatMoney(row.prevGross)}</span>
    ),
  },
  {
    key: "currGross",
    header: "Curr Gross",
    className: "text-right",
    cell: (row) => (
      <span className="font-mono text-[11px] tabular-nums">{formatMoney(row.currGross)}</span>
    ),
  },
  {
    key: "grossDelta",
    header: "Gross Δ",
    className: "text-right",
    cell: (row) => (
      <span className={cn("font-mono text-[11px] tabular-nums font-medium", getDeltaClass(row.grossDelta))}>
        {formatDelta(row.grossDelta)}
      </span>
    ),
  },
  {
    key: "prevNet",
    header: "Prev Net",
    className: "text-right",
    cell: (row) => (
      <span className="font-mono text-[11px] tabular-nums">{formatMoney(row.prevNet)}</span>
    ),
  },
  {
    key: "currNet",
    header: "Curr Net",
    className: "text-right",
    cell: (row) => (
      <span className="font-mono text-[11px] tabular-nums">{formatMoney(row.currNet)}</span>
    ),
  },
  {
    key: "netDelta",
    header: "Net Δ",
    className: "text-right",
    cell: (row) => (
      <span className={cn("font-mono text-[11px] tabular-nums font-medium", getDeltaClass(row.netDelta))}>
        {formatDelta(row.netDelta)}
      </span>
    ),
  },
];

export function ReportVariance({ month }: ReportVarianceProps) {
  const { data, isLoading } = usePayrollVariance(month);

  const totals = useMemo(() => {
    if (!data?.perEmployee.length) return null;
    return {
      grossDelta: data.perEmployee.reduce((s, r) => s + r.grossDelta, 0),
      netDelta: data.perEmployee.reduce((s, r) => s + r.netDelta, 0),
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {totals && (
        <StatCardGrid cols={2}>
          <StatCard
            label="Total Gross Δ"
            value={formatDelta(totals.grossDelta)}
            tone={totals.grossDelta >= 0 ? "emerald" : "red"}
          />
          <StatCard
            label="Total Net Δ"
            value={formatDelta(totals.netDelta)}
            tone={totals.netDelta >= 0 ? "emerald" : "red"}
          />
        </StatCardGrid>
      )}

      <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
        <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
          <DataTable
            data={data?.perEmployee ?? []}
            columns={COLUMNS}
            getRowKey={(row) => row.userId}
            minWidth="800px"
            emptyState={
              <EmptyState
                compact
                illustration={<EmptyReportIllustration />}
                title="No variance data"
                description="Variance is computed by comparing this month with the previous run."
              />
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
