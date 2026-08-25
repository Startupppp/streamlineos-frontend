"use client";

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { TruncatedText } from "@/components/ui/truncated-text";
import { EmptyReportIllustration } from "@/components/illustrations";
import { usePayrollRegister } from "@/hooks/api/payroll/reports";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import type { EmployeeRegisterRow, PayrollRegisterReport } from "@/types/payroll/reports";

interface ReportRegisterProps {
  month: string;
  department?: string;
  costCenter?: string;
  workerType?: string;
}

function buildColumns(report: PayrollRegisterReport): DataTableColumn<EmployeeRegisterRow>[] {
  const fixedStart: DataTableColumn<EmployeeRegisterRow>[] = [
    {
      key: "name",
      header: "Name",
      cell: (row) => <TruncatedText text={row.name ?? ""} className="text-dense font-medium" />,
    },
    {
      key: "department",
      header: "Department",
      cell: (row) => <TruncatedText text={row.department ?? ""} className="text-dense text-muted-foreground" />,
    },
    {
      key: "workerType",
      header: "Type",
      cell: (row) => <TruncatedText text={row.workerType ?? ""} className="text-dense text-muted-foreground" />,
    },
    {
      key: "paidDays",
      header: "Paid Days",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-dense tabular-nums">{row.paidDays}</span>
      ),
    },
  ];

  const dynamic: DataTableColumn<EmployeeRegisterRow>[] = report.columns.map((code) => ({
    key: code,
    header: code,
    className: "text-right",
    cell: (row) => (
      <span className="font-mono text-dense tabular-nums">
        {row.components[code] ? formatMoney(row.components[code]) : "—"}
      </span>
    ),
  }));

  const fixedEnd: DataTableColumn<EmployeeRegisterRow>[] = [
    {
      key: "gross",
      header: "Gross",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-dense tabular-nums">{formatMoney(row.gross)}</span>
      ),
    },
    {
      key: "totalDeductions",
      header: "Deductions",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-dense tabular-nums text-status-danger-ink">
          {row.totalDeductions ? `−${formatMoney(row.totalDeductions)}` : "—"}
        </span>
      ),
    },
    {
      key: "net",
      header: "Net",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-dense tabular-nums font-medium">{formatMoney(row.net)}</span>
      ),
    },
  ];

  return [...fixedStart, ...dynamic, ...fixedEnd];
}

export function ReportRegister({
  month,
  department,
  costCenter,
  workerType,
}: ReportRegisterProps) {
  const params = useMemo(
    () => ({
      month,
      ...(department && department !== "all" && { department }),
      ...(costCenter && costCenter !== "all" && { costCenter }),
      ...(workerType && workerType !== "all" && { workerType }),
    }),
    [month, department, costCenter, workerType],
  );

  const { data, isLoading } = usePayrollRegister(params);
  const columns = useMemo(() => (data ? buildColumns(data) : []), [data]);

  const totals = useMemo(() => {
    if (!data?.rows.length) return null;
    return {
      gross: data.rows.reduce((s, r) => s + r.gross, 0),
      deductions: data.rows.reduce((s, r) => s + r.totalDeductions, 0),
      net: data.rows.reduce((s, r) => s + r.net, 0),
    };
  }, [data]);

  const footerNode = totals ? (
    <span className="text-dense text-muted-foreground">
      Totals — Gross:{" "}
      <span className="font-mono">{formatMoney(totals.gross)}</span> · Net:{" "}
      <span className="font-mono">{formatMoney(totals.net)}</span> · Deductions:{" "}
      <span className="font-mono">{formatMoney(totals.deductions)}</span>
    </span>
  ) : undefined;

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-3">
      {data?.provisional && (
        <div className="flex items-start gap-2 rounded-md border border-status-warning-rule bg-status-warning-surface p-3 text-status-warning-ink">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning-ink" />
          <p className="text-xs">Figures are provisional until the run is locked.</p>
        </div>
      )}

      <DataTable
        className="flex-1 min-h-0"
        data={data?.rows ?? []}
        columns={columns}
        getRowKey={(row) => row.employeeId}
        isLoading={isLoading}
        minWidth="900px"
        footer={footerNode}
        pagination={{ pageSize: 50 }}
        emptyState={
          <EmptyState
            compact
            illustration={<EmptyReportIllustration />}
            title="No payroll register data"
            description="Run payroll for this month to generate the register."
          />
        }
      />
    </div>
  );
}
