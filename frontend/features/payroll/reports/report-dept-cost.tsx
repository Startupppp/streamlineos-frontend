"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyReportIllustration } from "@/components/illustrations";
import { usePayrollDeptCost } from "@/hooks/api/payroll/reports";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { DeptCostRow } from "@/types/payroll/reports";

interface ReportDeptCostProps {
  month: string;
  department?: string;
  workerType?: string;
}

const COLUMNS: DataTableColumn<DeptCostRow>[] = [
  {
    key: "department",
    header: "Department",
    cell: (row) => <TruncatedText text={row.department ?? ""} className="text-[11px] font-medium" />,
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
  {
    key: "employerCostTotal",
    header: "Employer Cost",
    className: "text-right",
    cell: (row) => (
      <span className="font-mono text-[11px] tabular-nums text-right">{formatMoney(row.employerCostTotal)}</span>
    ),
  },
];

export function ReportDeptCost({ month, department, workerType }: ReportDeptCostProps) {
  const params = useMemo(
    () => ({
      month,
      ...(department && department !== "all" && { department }),
      ...(workerType && workerType !== "all" && { workerType }),
    }),
    [month, department, workerType],
  );

  const { data, isLoading } = usePayrollDeptCost(params);

  const totals = useMemo(() => {
    if (!data?.rows.length) return null;
    return {
      gross: data.rows.reduce((s, r) => s + r.grossTotal, 0),
      net: data.rows.reduce((s, r) => s + r.netTotal, 0),
      employer: data.rows.reduce((s, r) => s + r.employerCostTotal, 0),
    };
  }, [data]);

  const footerNode = totals ? (
    <span className="text-[11px] text-muted-foreground">
      Totals — Gross:{" "}
      <span className="font-mono">{formatMoney(totals.gross)}</span> · Net:{" "}
      <span className="font-mono">{formatMoney(totals.net)}</span> · Employer Cost:{" "}
      <span className="font-mono">{formatMoney(totals.employer)}</span>
    </span>
  ) : undefined;

  return (
    <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
      <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
        <DataTable
          data={data?.rows ?? []}
          columns={COLUMNS}
          getRowKey={(row) => row.department}
          isLoading={isLoading}
          footer={footerNode}
          emptyState={
            <EmptyState
              compact
              illustration={<EmptyReportIllustration />}
              title="No department cost data"
              description="Run payroll for this month to see department cost breakdown."
            />
          }
        />
      </CardContent>
    </Card>
  );
}
