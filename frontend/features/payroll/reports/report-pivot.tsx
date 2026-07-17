"use client";

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { TruncatedText } from "@/components/ui/truncated-text";
import { EmptyReportIllustration } from "@/components/illustrations";
import {
  usePayrollEarnings,
  usePayrollDeductions,
  usePayrollReimbursementsReport,
  usePayrollTaxReport,
} from "@/hooks/api/payroll/reports";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import type { ComponentPivotReport, ComponentPivotRow } from "@/types/payroll/reports";

type PivotReportType = "earnings" | "deductions" | "reimbursements" | "tax";

interface ReportPivotProps {
  reportType: PivotReportType;
  month: string;
  department?: string;
  costCenter?: string;
  workerType?: string;
}

const REPORT_TITLES: Record<PivotReportType, string> = {
  earnings: "Earnings",
  deductions: "Deductions",
  reimbursements: "Reimbursements",
  tax: "Tax",
};

function useReport(reportType: PivotReportType, params: {
  month: string;
  department?: string;
  costCenter?: string;
  workerType?: string;
}) {
  const earnings = usePayrollEarnings(params);
  const deductions = usePayrollDeductions(params);
  const reimbursements = usePayrollReimbursementsReport(params);
  const tax = usePayrollTaxReport(params);

  if (reportType === "earnings") return earnings;
  if (reportType === "deductions") return deductions;
  if (reportType === "reimbursements") return reimbursements;
  return tax;
}

function buildColumns(report: ComponentPivotReport): DataTableColumn<ComponentPivotRow>[] {
  const fixed: DataTableColumn<ComponentPivotRow>[] = [
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
  ];

  const dynamic: DataTableColumn<ComponentPivotRow>[] = report.columns.map((code) => ({
    key: code,
    header: code,
    className: "text-right",
    cell: (row) => (
      <span className="font-mono text-[11px] tabular-nums">
        {row.components[code] ? formatMoney(row.components[code]) : "—"}
      </span>
    ),
  }));

  return [...fixed, ...dynamic];
}

export function ReportPivot({
  reportType,
  month,
  department,
  costCenter,
  workerType,
}: ReportPivotProps) {
  const params = useMemo(
    () => ({
      month,
      ...(department && department !== "all" && { department }),
      ...(costCenter && costCenter !== "all" && { costCenter }),
      ...(workerType && workerType !== "all" && { workerType }),
    }),
    [month, department, costCenter, workerType],
  );

  const { data, isLoading } = useReport(reportType, params);

  const columns = useMemo(
    () => (data ? buildColumns(data) : []),
    [data],
  );

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
            minWidth="800px"
            pagination={{ pageSize: 50 }}
            emptyState={
              <EmptyState
                compact
                illustration={<EmptyReportIllustration />}
                title={`No ${REPORT_TITLES[reportType].toLowerCase()} data`}
                description="Run payroll for this month to see the breakdown."
              />
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
