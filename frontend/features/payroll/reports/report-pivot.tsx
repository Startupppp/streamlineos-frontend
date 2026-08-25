"use client";

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";

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
  const earnings = usePayrollEarnings(params, { enabled: reportType === "earnings" });
  const deductions = usePayrollDeductions(params, { enabled: reportType === "deductions" });
  const reimbursements = usePayrollReimbursementsReport(params, { enabled: reportType === "reimbursements" });
  const tax = usePayrollTaxReport(params, { enabled: reportType === "tax" });

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
  ];

  const dynamic: DataTableColumn<ComponentPivotRow>[] = report.columns.map((code) => ({
    key: code,
    header: code,
    className: "text-right",
    cell: (row) => (
      <span className="font-mono text-dense tabular-nums">
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
        minWidth="800px"
        pagination={{ pageSize: 50 }}
        mobileCard={(row) => {
          const amounts = Object.values(row.components ?? {}).filter(Boolean);
          return (
            <div className="space-y-1">
              <p className="text-sm font-medium truncate">{row.name || "Unknown"}</p>
              <p className="text-dense text-muted-foreground truncate">
                {row.department || "—"} · {row.workerType || "—"}
              </p>
              <p className="text-dense text-muted-foreground">
                {amounts.length} component{amounts.length === 1 ? "" : "s"}
              </p>
            </div>
          );
        }}
        emptyState={
          <EmptyState
            compact
            illustration={<EmptyReportIllustration />}
            title={`No ${REPORT_TITLES[reportType].toLowerCase()} data`}
            description="Run payroll for this month to see the breakdown."
          />
        }
      />
    </div>
  );
}
