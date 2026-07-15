"use client";

import { useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useCan } from "@/hooks/api/access";
import {
  useExportPayrollReport,
  useExportJournal,
} from "@/hooks/api/payroll/reports";
import { formatMonth } from "@/features/payroll/shared/payroll-format";
import type { PayrollReportType } from "@/types/payroll/reports";
import { ReportFilters } from "./report-filters";
import { ReportSelector } from "./report-selector";
import { ExportCsvButton } from "./export-csv-button";
import { ReportSummary } from "./report-summary";
import { ReportRegister } from "./report-register";
import { ReportDeptCost } from "./report-dept-cost";
import { ReportCostCenter } from "./report-cost-center";
import { ReportPivot } from "./report-pivot";
import { ReportBankPayout } from "./report-bank-payout";
import { ReportVariance } from "./report-variance";
import { ReportJournal } from "./report-journal";

const VALID_REPORT_TYPES: PayrollReportType[] = [
  "summary", "register", "department-cost", "cost-center",
  "earnings", "deductions", "reimbursements", "tax",
  "bank-payout", "variance", "journal",
];

const REPORT_TYPE_SET = new Set<string>(VALID_REPORT_TYPES);

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function isValidReportType(value: string): value is PayrollReportType {
  return REPORT_TYPE_SET.has(value);
}

function ActiveReport({
  activeReport,
  month,
  department,
  costCenter,
  workerType,
}: {
  activeReport: PayrollReportType;
  month: string;
  department: string;
  costCenter: string;
  workerType: string;
}) {
  const dept = department !== "all" ? department : undefined;
  const cc = costCenter !== "all" ? costCenter : undefined;
  const wt = workerType !== "all" ? workerType : undefined;

  switch (activeReport) {
    case "summary":
      return <ReportSummary month={month} department={dept} costCenter={cc} workerType={wt} />;
    case "register":
      return <ReportRegister month={month} department={dept} costCenter={cc} workerType={wt} />;
    case "department-cost":
      return <ReportDeptCost month={month} department={dept} workerType={wt} />;
    case "cost-center":
      return <ReportCostCenter month={month} costCenter={cc} workerType={wt} />;
    case "earnings":
      return <ReportPivot reportType="earnings" month={month} department={dept} costCenter={cc} workerType={wt} />;
    case "deductions":
      return <ReportPivot reportType="deductions" month={month} department={dept} costCenter={cc} workerType={wt} />;
    case "reimbursements":
      return <ReportPivot reportType="reimbursements" month={month} department={dept} costCenter={cc} workerType={wt} />;
    case "tax":
      return <ReportPivot reportType="tax" month={month} department={dept} costCenter={cc} workerType={wt} />;
    case "bank-payout":
      return <ReportBankPayout month={month} />;
    case "variance":
      return <ReportVariance month={month} />;
    case "journal":
      return <ReportJournal month={month} />;
  }
}

export function ReportsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const canExport = useCan("payroll:reports:export");

  const currentMonth = getCurrentMonth();
  const month = searchParams.get("month") ?? currentMonth;
  const rawReport = searchParams.get("report") ?? "summary";
  const activeReport: PayrollReportType = isValidReportType(rawReport) ? rawReport : "summary";
  const department = searchParams.get("department") ?? "all";
  const costCenter = searchParams.get("costCenter") ?? "all";
  const workerType = searchParams.get("workerType") ?? "all";

  const exportReport = useExportPayrollReport();
  const exportJournal = useExportJournal();

  const updateParam = useCallback(
    (key: string, value: string, resetPage = true) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all" || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      if (resetPage) params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname],
  );

  function handleMonthChange(v: string) {
    updateParam("month", v);
  }

  function handleDepartmentChange(v: string) {
    updateParam("department", v);
  }

  function handleCostCenterChange(v: string) {
    updateParam("costCenter", v);
  }

  function handleWorkerTypeChange(v: string) {
    updateParam("workerType", v);
  }

  function handleReportSelect(r: PayrollReportType) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("report", r);
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleExport() {
    const dept = department !== "all" ? department : undefined;
    const cc = costCenter !== "all" ? costCenter : undefined;
    const wt = workerType !== "all" ? workerType : undefined;

    if (activeReport === "journal") {
      exportJournal.mutate(
        { month },
        { onError: () => toast.error("Export failed") },
      );
    } else {
      exportReport.mutate(
        { reportType: activeReport, month, department: dept, costCenter: cc, workerType: wt },
        { onError: () => toast.error("Export failed") },
      );
    }
  }

  const isExporting = exportReport.isPending || exportJournal.isPending;

  const filtersNode = (
    <ReportFilters
      month={month}
      department={department}
      costCenter={costCenter}
      workerType={workerType}
      onMonthChange={handleMonthChange}
      onDepartmentChange={handleDepartmentChange}
      onCostCenterChange={handleCostCenterChange}
      onWorkerTypeChange={handleWorkerTypeChange}
    />
  );

  const actionsNode = canExport ? (
    <ExportCsvButton
      onExport={handleExport}
      isLoading={isExporting}
    />
  ) : null;

  return (
    <PageWrapper
      title="Payroll Reports"
      subtitle={formatMonth(month)}
      filters={filtersNode}
      actions={actionsNode}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:gap-6 min-h-0">
        <ReportSelector activeReport={activeReport} onSelect={handleReportSelect} />

        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <ActiveReport
            activeReport={activeReport}
            month={month}
            department={department}
            costCenter={costCenter}
            workerType={workerType}
          />
        </div>
      </div>
    </PageWrapper>
  );
}
