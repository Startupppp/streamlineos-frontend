"use client";

import { useCallback, useMemo } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
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
    cell: (row) => <TruncatedText text={row.department ?? ""} className="text-dense font-medium" />,
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
  {
    key: "employerCostTotal",
    header: "Employer Cost",
    className: "text-right",
    cell: (row) => (
      <span className="font-mono text-dense tabular-nums text-right">{formatMoney(row.employerCostTotal)}</span>
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

  const { data, isLoading, isError, error, refetch } = usePayrollDeptCost(params);
  const handleRetry = useCallback(() => void refetch(), [refetch]);

  const totals = useMemo(() => {
    if (!data?.rows.length) return null;
    return {
      gross: data.rows.reduce((s, r) => s + r.grossTotal, 0),
      net: data.rows.reduce((s, r) => s + r.netTotal, 0),
      employer: data.rows.reduce((s, r) => s + r.employerCostTotal, 0),
    };
  }, [data]);

  const footerNode = totals ? (
    <span className="text-dense text-muted-foreground">
      Totals — Gross:{" "}
      <span className="font-mono">{formatMoney(totals.gross)}</span> · Net:{" "}
      <span className="font-mono">{formatMoney(totals.net)}</span> · Employer Cost:{" "}
      <span className="font-mono">{formatMoney(totals.employer)}</span>
    </span>
  ) : undefined;

  if (isError) {
    return (
      <ErrorState
        className="flex-1"
        title="Couldn't load department cost"
        description={getErrorMessage(error)}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <DataTable
      className="flex-1 min-h-0"
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
  );
}
