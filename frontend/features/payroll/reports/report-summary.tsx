"use client";

import { Users, TrendingUp, Wallet, Building2, TrendingDown, AlertTriangle } from "lucide-react";

import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyReportIllustration } from "@/components/illustrations";
import { usePayrollSummary } from "@/hooks/api/payroll/reports";
import { formatMoney } from "@/features/payroll/shared/payroll-format";

interface ReportSummaryProps {
  month: string;
  department?: string;
  costCenter?: string;
  workerType?: string;
}

export function ReportSummary({ month, department, costCenter, workerType }: ReportSummaryProps) {
  const { data, isLoading } = usePayrollSummary({ month, department, costCenter, workerType });

  if (isLoading) return <StatCardGridSkeleton cols={4} count={7} />;

  if (!data?.run) {
    return (
      <EmptyState
        illustration={<EmptyReportIllustration />}
        title="No payroll run for this period"
        description="Run payroll for this month to see summary figures."
      />
    );
  }

  const { run, provisional } = data;
  const exceptionTone = run.exceptionCount > 0 ? "red" : "emerald";

  return (
    <div className="flex flex-col gap-4">
      {provisional && (
        <div className="flex items-start gap-2 rounded-md border border-status-warning-rule bg-status-warning-surface p-3 text-status-warning-ink">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning-ink" />
          <p className="text-xs">Figures are provisional until the run is locked.</p>
        </div>
      )}

      <StatCardGrid cols={4}>
        <StatCard
          label="Employees"
          value={run.employeeCount}
          icon={Users}
          tone="blue"
        />
        <StatCard
          label="Gross Total"
          value={formatMoney(run.grossTotal)}
          icon={TrendingUp}
          tone="emerald"
        />
        <StatCard
          label="Net Total"
          value={formatMoney(run.netTotal)}
          icon={Wallet}
          tone="blue"
        />
        <StatCard
          label="Employer Cost"
          value={formatMoney(run.employerCostTotal)}
          icon={Building2}
          tone="default"
        />
        <StatCard
          label="Deductions"
          value={formatMoney(run.deductionTotal)}
          icon={TrendingDown}
          tone="amber"
        />
        <StatCard
          label="Exceptions"
          value={run.exceptionCount}
          icon={AlertTriangle}
          tone={exceptionTone}
        />
        <StatCard
          label="Status"
          value={run.status.replace(/_/g, " ")}
          tone="default"
        />
      </StatCardGrid>
    </div>
  );
}
