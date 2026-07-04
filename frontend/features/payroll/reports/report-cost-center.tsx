"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyReportIllustration } from "@/components/illustrations";
import { usePayrollCostCenter } from "@/hooks/api/payroll/reports";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import type { CostCenterRow } from "@/types/payroll/reports";

interface ReportCostCenterProps {
  month: string;
  costCenter?: string;
  workerType?: string;
}

const COLUMNS: DataTableColumn<CostCenterRow>[] = [
  {
    key: "costCenter",
    header: "Cost Center",
    cell: (row) => <span className="text-[11px] font-medium">{row.costCenter}</span>,
  },
  {
    key: "employeeCount",
    header: "Employees",
    className: "text-right",
    cell: (row) => (
      <span className="font-mono text-[11px] tabular-nums text-right">{row.employeeCount}</span>
    ),
  },
  {
    key: "grossTotal",
    header: "Gross Total",
    className: "text-right",
    cell: (row) => (
      <span className="font-mono text-[11px] tabular-nums text-right">{formatMoney(row.grossTotal)}</span>
    ),
  },
  {
    key: "netTotal",
    header: "Net Total",
    className: "text-right",
    cell: (row) => (
      <span className="font-mono text-[11px] tabular-nums text-right">{formatMoney(row.netTotal)}</span>
    ),
  },
];

export function ReportCostCenter({ month, costCenter, workerType }: ReportCostCenterProps) {
  const params = useMemo(
    () => ({
      month,
      ...(costCenter && costCenter !== "all" && { costCenter }),
      ...(workerType && workerType !== "all" && { workerType }),
    }),
    [month, costCenter, workerType],
  );

  const { data, isLoading } = usePayrollCostCenter(params);

  const totals = useMemo(() => {
    if (!data?.rows.length) return null;
    return {
      gross: data.rows.reduce((s, r) => s + r.grossTotal, 0),
      net: data.rows.reduce((s, r) => s + r.netTotal, 0),
    };
  }, [data]);

  const footerNode = totals ? (
    <span className="text-[11px] text-muted-foreground">
      Totals — Gross:{" "}
      <span className="font-mono">{formatMoney(totals.gross)}</span> · Net:{" "}
      <span className="font-mono">{formatMoney(totals.net)}</span>
    </span>
  ) : undefined;

  return (
    <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
      <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
        <DataTable
          data={data?.rows ?? []}
          columns={COLUMNS}
          getRowKey={(row) => row.costCenter}
          isLoading={isLoading}
          footer={footerNode}
          emptyState={
            <EmptyState
              compact
              illustration={<EmptyReportIllustration />}
              title="No cost center data"
              description="Run payroll for this month to see cost center breakdown."
            />
          }
        />
      </CardContent>
    </Card>
  );
}
