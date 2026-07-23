"use client";

import { useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { DollarSign, TrendingDown, Users } from "lucide-react";
import { RunStatusBadge } from "@/features/payroll/runs/run-status-badge";
import { RunStatusStepper } from "@/features/payroll/runs/run-status-stepper";
import { RunActionsSlot } from "@/features/payroll/runs/run-actions-slot";
import { ApprovalStagePanel, MarkPaidPanel } from "@/features/payroll/payout";
import { EmployeesTab } from "@/features/payroll/runs/employees-tab";
import { ExceptionsTab } from "@/features/payroll/runs/exceptions-tab";
import { InputsTab } from "@/features/payroll/runs/inputs-tab";
import { VarianceTab } from "@/features/payroll/runs/variance-tab";
import { formatMoney, formatMonth } from "@/features/payroll/shared/payroll-format";
import { usePayrollRun } from "@/hooks/api/payroll/runs";
import { ErrorState } from "@/components/shared";

const LOCKED_STATUSES = new Set(["LOCKED", "PAID", "PAYSLIPS_PUBLISHED", "CLOSED"]);

interface RunDetailContentProps {
  runId: number;
}

export function RunDetailContent({ runId }: RunDetailContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get("tab") ?? "employees";

  const { data, isLoading, error, refetch } = usePayrollRun(runId);
  const run = data?.run;

  const isLocked = run ? LOCKED_STATUSES.has(run.status) : false;

  const handleChanged = useCallback(() => {
    refetch();
  }, [refetch]);

  function handleTabChange(tab: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/payroll/runs/${runId}?${params.toString()}`);
  }

  const openExceptions = run?.exceptionCount ?? 0;

  if (isLoading) {
    return (
      <PageWrapper title="Payroll Run" backHref="/payroll/runs">
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-xl" />
          <StatCardGridSkeleton cols={4} count={4} />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper title="Payroll Run" backHref="/payroll/runs">
        <ErrorState
          title="Failed to load run"
          description="This payroll run could not be loaded. You may not have access or it may not exist."
          onRetry={refetch}
        />
      </PageWrapper>
    );
  }

  if (!run) {
    return (
      <PageWrapper title="Run not found" backHref="/payroll/runs">
        <p className="text-sm text-muted-foreground">This payroll run does not exist.</p>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={formatMonth(run.month)}
      backHref="/payroll/runs"
      subtitle={
        <span className="flex items-center gap-2">
          <RunStatusBadge status={run.status} />
          {run.status === "REOPENED" && run.reopenReason && (
            <span className="text-amber-600 text-[11px]">Reason: {run.reopenReason}</span>
          )}
        </span>
      }
      actions={
        <div className="flex items-center gap-2">
          <RunActionsSlot run={run} onChanged={handleChanged} />
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {isLocked && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 text-[11px] text-muted-foreground">
            <span>🔒</span>
            <span>Locked — snapshot immutable. No changes can be made to this run.</span>
          </div>
        )}

        {data?.payoutHealth && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-[11px] text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            <span>⚠️</span>
            <span>
              This run is marked {run.status.replace(/_/g, " ")}, but not everyone was actually paid:{" "}
              {data.payoutHealth.failedCount > 0 &&
                `${data.payoutHealth.failedCount} payment${data.payoutHealth.failedCount === 1 ? "" : "s"} failed`}
              {data.payoutHealth.failedCount > 0 && data.payoutHealth.heldCount > 0 && ", "}
              {data.payoutHealth.heldCount > 0 &&
                `${data.payoutHealth.heldCount} employee${data.payoutHealth.heldCount === 1 ? "" : "s"} held`}
              . Review the Employees tab and retry or resolve before treating this run as complete.
            </span>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-4">
          <RunStatusStepper status={run.status} />
        </div>

        <ApprovalStagePanel runId={runId} status={run.status} onChanged={handleChanged} />
        <MarkPaidPanel runId={runId} status={run.status} onChanged={handleChanged} />

        <StatCardGrid cols={4}>
          <StatCard
            label="Net Payable"
            value={formatMoney(run.netTotal)}
            tone="blue"
            icon={DollarSign}
          />
          <StatCard label="Gross" value={formatMoney(run.grossTotal)} />
          <StatCard
            label="Deductions"
            value={formatMoney(run.deductionTotal)}
            tone="amber"
            icon={TrendingDown}
          />
          <StatCard
            label="Employees"
            value={run.employeeCount ?? 0}
            icon={Users}
          />
        </StatCardGrid>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="employees">
              Employees
            </TabsTrigger>
            <TabsTrigger value="exceptions" className="flex items-center gap-1">
              Exceptions
              {openExceptions > 0 && (
                <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-100 text-red-700 text-[9px] font-bold dark:bg-red-500/10 dark:text-red-300">
                  {openExceptions}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="inputs">
              Inputs
            </TabsTrigger>
            <TabsTrigger value="variance">
              Variance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="mt-3">
            <EmployeesTab runId={runId} isLocked={isLocked} />
          </TabsContent>
          <TabsContent value="exceptions" className="mt-3">
            <ExceptionsTab runId={runId} isLocked={isLocked} />
          </TabsContent>
          <TabsContent value="inputs" className="mt-3">
            <InputsTab runId={runId} isLocked={isLocked} />
          </TabsContent>
          <TabsContent value="variance" className="mt-3">
            <VarianceTab runId={runId} />
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
}
