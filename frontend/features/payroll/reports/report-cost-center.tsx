"use client";

import { useMemo } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyReportIllustration } from "@/components/illustrations";
import { usePayrollCostCenter } from "@/hooks/api/payroll/reports";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import { TruncatedText } from "@/components/ui/truncated-text";
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
    cell: (row) => <TruncatedText text={row.costCenter ?? ""} className="text-dense font-medium" />,
  },
  {
    key: "employeeCount",
    header: "Employees",
    className: "text-right",
    cell: (row) => (
      <span className="font-mono text-dense tabular-nums text-right">{row.employeeCount}</span>
    ),
  },
  {
    key: "grossTotal",
    header: "Gross Total",
    className: "text-right",
    cell: (row) => (
      <span className="font-mono text-dense tabular-nums text-right">{formatMoney(row.grossTotal)}</span>
    ),
  },
  {
    key: "netTotal",
    header: "Net Total",
    className: "text-right",
    cell: (row) => (
      <span className="font-mono text-dense tabular-nums text-right">{formatMoney(row.netTotal)}</span>
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
    <span className="text-dense text-muted-foreground">
      Totals — Gross:{" "}
      <span className="font-mono">{formatMoney(totals.gross)}</span> · Net:{" "}
      <span className="font-mono">{formatMoney(totals.net)}</span>
    </span>
  ) : undefined;

  return (
    <DataTable
      className="flex-1 min-h-0"
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
  );
}
