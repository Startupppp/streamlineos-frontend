"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, DollarSign, Users, TrendingDown } from "lucide-react";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import { MonthPicker } from "@/features/payroll/shared/month-picker";
import { formatMoney, formatMonth } from "@/features/payroll/shared/payroll-format";
import { RunStatusBadge } from "@/features/payroll/runs/run-status-badge";
import { ChecklistCard } from "@/features/payroll/runs/checklist-card";
import { CommandCenterPanels } from "@/features/payroll/runs/command-center-panels";
import { EmptyPayroll } from "@/components/illustrations";
import { useCommandCenter } from "@/hooks/api/payroll/command-center";
import { useCreateRun } from "@/hooks/api/payroll/runs";
import { useCan } from "@/hooks/api/access";
import type { PayrollRunStatus } from "@/types/payroll/runs";

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function PrimaryAction({
  status,
  runId,
  onCreateRun,
  isPending,
}: {
  status: PayrollRunStatus | null;
  runId?: number;
  onCreateRun: () => void;
  isPending: boolean;
}) {
  if (!status) {
    return (
      <Button size="sm" onClick={onCreateRun} disabled={isPending}>
        Start payroll run
      </Button>
    );
  }
  if (status === "EXCEPTIONS_FOUND") {
    return (
      <Button size="sm" asChild>
        <Link href={runId ? `/payroll/runs/${runId}?tab=exceptions` : "/payroll/runs"}>
          Review exceptions
        </Link>
      </Button>
    );
  }
  if (status === "PREVIEW_READY" || status === "DRAFT") {
    return (
      <Button size="sm" asChild>
        <Link href={runId ? `/payroll/runs/${runId}` : "/payroll/runs"}>
          Review & submit
        </Link>
      </Button>
    );
  }
  if (status === "PENDING_APPROVAL") {
    return (
      <Button size="sm" asChild>
        <Link href={runId ? `/payroll/runs/${runId}` : "/payroll/runs"}>
          Review approval
        </Link>
      </Button>
    );
  }
  return (
    <Button size="sm" variant="outline" asChild>
      <Link href={runId ? `/payroll/runs/${runId}` : "/payroll/runs"}>
        View run
      </Link>
    </Button>
  );
}

export default function PayrollCommandCenterPage() {
  const [month, setMonth] = useState(currentYearMonth);
  const router = useRouter();
  const canView = useCan("payroll:runs:view");
  const canManage = useCan("payroll:runs:manage");
  const canViewPolicies = useCan("payroll:policies:view");

  const { data, isLoading, error } = useCommandCenter(month);
  const createRunMutation = useCreateRun();

  if (!canView) {
    return (
      <PageWrapper variant="display" title="Payroll">
        <EmptyState
          title="Access Denied"
          description="You don't have permission to view the payroll command center."
          compact
        />
      </PageWrapper>
    );
  }

  function handleCreateRun() {
    createRunMutation.mutate(month, {
      onSuccess: (res) => {
        toast.success("Payroll run started");
        router.push(`/payroll/runs/${res.runId}`);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
      },
    });
  }

  const runId = data?.header.runId ?? undefined;
  const header = data?.header;
  const excCount = header ? header.exceptionCounts.BLOCKER + header.exceptionCounts.WARNING : 0;

  const isPreSetup = !isLoading && (error || !data);

  return (
    <PageWrapper
      variant="display"
      title="Payroll"
      subtitle={
        header?.status ? (
          <span className="flex items-center gap-2">
            <span>{formatMonth(month)}</span>
            <RunStatusBadge status={header.status} />
          </span>
        ) : (
          formatMonth(month)
        )
      }
      actions={
        <div className="flex items-center gap-2">
          <MonthPicker value={month} onChange={setMonth} yearRange={[-2, 0]} className="w-44" />
          {canManage && (
            <PrimaryAction
              status={header?.status ?? null}
              runId={runId}
              onCreateRun={handleCreateRun}
              isPending={createRunMutation.isPending}
            />
          )}
        </div>
      }
    >
      {isLoading && (
        <div className="space-y-4">
          <StatCardGridSkeleton cols={5} count={5} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <Skeleton className="h-64 rounded-xl" />
            </div>
            <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      )}

      {!isLoading && isPreSetup && (
        <EmptyState
          illustration={<EmptyPayroll />}
          title="Set up payroll in minutes"
          description="Configure your payroll policy, salary components, and statutory settings to get started."
          action={
            canViewPolicies
              ? { label: "Set up payroll", href: "/payroll/setup" }
              : undefined
          }
        />
      )}

      {!isLoading && data && (
        <div className="space-y-4">
          <StatCardGrid cols={5}>
            <StatCard
              label="Net Payable"
              value={formatMoney(header?.netTotal)}
              tone="blue"
              icon={DollarSign}
            />
            <StatCard
              label="Gross"
              value={formatMoney(header?.grossTotal)}
            />
            <StatCard
              label="Deductions"
              value={formatMoney(header?.deductionTotal)}
              tone="amber"
              icon={TrendingDown}
            />
            <StatCard
              label="Employees"
              value={header?.employeeCount ?? 0}
              icon={Users}
            />
            <StatCard
              label="Exceptions"
              value={excCount}
              tone={excCount > 0 ? "red" : "emerald"}
              icon={AlertTriangle}
              href={excCount > 0 ? "/payroll/runs" : undefined}
            />
          </StatCardGrid>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              {data.checklist.length > 0 ? (
                <ChecklistCard items={data.checklist} />
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-card p-4 min-h-[200px]">
                  <ChartEmptyState
                    message="Start a payroll run to see the checklist"
                    height={200}
                    compact
                  />
                </div>
              )}
            </div>
            <div className="lg:col-span-2">
              <CommandCenterPanels data={data} runId={runId} />
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
