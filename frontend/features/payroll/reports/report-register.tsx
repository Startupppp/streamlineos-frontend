"use client";

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
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
      cell: (row) => <TruncatedText text={row.name ?? ""} className="text-[11px] font-medium" />,
    },
    {
      key: "department",
      header: "Department",
      cell: (row) => <TruncatedText text={row.department ?? ""} className="text-[11px] text-muted-foreground" />,
    },
    {
      key: "workerType",
      header: "Type",
      cell: (row) => <TruncatedText text={row.workerType ?? ""} className="text-[11px] text-muted-foreground" />,
    },
    {
      key: "paidDays",
      header: "Paid Days",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-[11px] tabular-nums">{row.paidDays}</span>
      ),
    },
  ];

  const dynamic: DataTableColumn<EmployeeRegisterRow>[] = report.columns.map((code) => ({
    key: code,
    header: code,
    className: "text-right",
    cell: (row) => (
      <span className="font-mono text-[11px] tabular-nums">
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
        <span className="font-mono text-[11px] tabular-nums">{formatMoney(row.gross)}</span>
      ),
    },
    {
      key: "totalDeductions",
      header: "Deductions",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-[11px] tabular-nums text-red-600 dark:text-red-400">
          {row.totalDeductions ? `−${formatMoney(row.totalDeductions)}` : "—"}
        </span>
      ),
    },
    {
      key: "net",
      header: "Net",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-[11px] tabular-nums font-medium">{formatMoney(row.net)}</span>
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
    <span className="text-[11px] text-muted-foreground">
      Totals — Gross:{" "}
      <span className="font-mono">{formatMoney(totals.gross)}</span> · Net:{" "}
      <span className="font-mono">{formatMoney(totals.net)}</span> · Deductions:{" "}
      <span className="font-mono">{formatMoney(totals.deductions)}</span>
    </span>
  ) : undefined;

  return (
    <div className="flex flex-col gap-3">
      {data?.provisional && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-[12px]">Figures are provisional until the run is locked.</p>
        </div>
      )}

      <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
        <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
          <DataTable
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
        </CardContent>
      </Card>
    </div>
  );
}
