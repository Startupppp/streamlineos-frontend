"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, DollarSign, Users, TrendingDown } from "lucide-react";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import { MonthPicker } from "@/features/payroll/shared/month-picker";
import { formatMoney, formatMonth } from "@/features/payroll/shared/payroll-format";
import { RunStatusBadge } from "@/features/payroll/runs/run-status-badge";
import { ChecklistCard } from "@/features/payroll/runs/checklist-card";
import { CommandCenterPanels } from "@/features/payroll/runs/command-center-panels";
import { ReadinessRail } from "@/features/payroll/shared/readiness-rail";
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
      <LoadingButton size="sm" onClick={onCreateRun} isPending={isPending} loadingText="Starting…">
        Start Payroll Run
      </LoadingButton>
    );
  }
  if (status === "EXCEPTIONS_FOUND") {
    return (
      <Button size="sm" asChild>
        <Link href={runId ? `/payroll/runs/${runId}?tab=exceptions` : "/payroll/runs"}>
          Review Exceptions
        </Link>
      </Button>
    );
  }
  if (status === "PREVIEW_READY" || status === "DRAFT") {
    return (
      <Button size="sm" asChild>
        <Link href={runId ? `/payroll/runs/${runId}` : "/payroll/runs"}>
          Review & Submit
        </Link>
      </Button>
    );
  }
  if (status === "PENDING_APPROVAL") {
    return (
      <Button size="sm" asChild>
        <Link href={runId ? `/payroll/runs/${runId}` : "/payroll/runs"}>
          Review Approval
        </Link>
      </Button>
    );
  }
  return (
    <Button size="sm" variant="outline" asChild>
      <Link href={runId ? `/payroll/runs/${runId}` : "/payroll/runs"}>
        View Run
      </Link>
    </Button>
  );
}

export function PayrollCommandCenterPage() {
  const [month, setMonth] = useState(currentYearMonth);
  const router = useRouter();
  const canView = useCan("payroll:runs:view");
  const canManage = useCan("payroll:runs:manage");
  const canViewPolicies = useCan("payroll:policies:view");

  const { data, isLoading, isError, error, refetch } = useCommandCenter(month);
  const createRunMutation = useCreateRun();

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

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

  const isPreSetup = !isLoading && !isError && !data;

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
        <div className="flex flex-1 min-h-0 flex-col gap-4">
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

      {!isLoading && isError && (
        <ErrorState
          className="flex-1"
          title="Couldn't load the payroll command center"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      )}

      {isPreSetup && (
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
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] gap-4 items-start">
            <div className="space-y-4 min-w-0 order-2 lg:order-1">
              <StatCardGrid cols={4}>
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
                  label="Exceptions"
                  value={excCount}
                  tone={excCount > 0 ? "red" : "emerald"}
                  icon={AlertTriangle}
                  href={
                    excCount > 0 && runId
                      ? `/payroll/runs/${runId}?tab=exceptions`
                      : undefined
                  }
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

            <div className="order-1 lg:order-2 space-y-3">
              <ReadinessRail
                variant="rail"
                canPay={
                  !!header &&
                  header.exceptionCounts.BLOCKER === 0 &&
                  (header.status === "LOCKED" ||
                    header.status === "APPROVED" ||
                    header.status === "PAID")
                }
                totals={{
                  gross: formatMoney(header?.grossTotal),
                  deductions: formatMoney(header?.deductionTotal),
                  net: formatMoney(header?.netTotal),
                  employees: header?.employeeCount,
                }}
                ruleVersion="IN-2025.04"
                warnings={
                  header && header.exceptionCounts.WARNING > 0
                    ? [
                        {
                          id: "warn",
                          label: `${header.exceptionCounts.WARNING} warning(s)`,
                          href: runId ? `/payroll/runs/${runId}?tab=exceptions` : undefined,
                        },
                      ]
                    : []
                }
                blockers={[
                  ...(header && header.exceptionCounts.BLOCKER > 0
                    ? [
                        {
                          id: "blockers",
                          label: `${header.exceptionCounts.BLOCKER} blocking exception(s)`,
                          href: runId ? `/payroll/runs/${runId}?tab=exceptions` : undefined,
                        },
                      ]
                    : []),
                  ...(header?.status === "PREPARING" || header?.status === "EXCEPTIONS_FOUND"
                    ? [
                        {
                          id: "not-ready",
                          label: "Run is not approved/locked yet",
                          href: runId ? `/payroll/runs/${runId}` : undefined,
                        },
                      ]
                    : []),
                ]}
                changes={
                  data.panels.varianceSummary
                    ? [
                        {
                          id: "net-delta",
                          label: `Net variance ${data.panels.varianceSummary.netDelta} vs prior period`,
                        },
                        {
                          id: "changed",
                          label: `${data.panels.varianceSummary.changedEmployees} employee(s) changed`,
                        },
                      ]
                    : []
                }
                nextAction={
                  header?.status === "EXCEPTIONS_FOUND"
                    ? {
                        label: "Resolve blockers",
                        href: runId ? `/payroll/runs/${runId}?tab=exceptions` : "/payroll/runs",
                      }
                    : header?.status === "PREVIEW_READY" || header?.status === "DRAFT"
                      ? {
                          label: "Review & submit for approval",
                          href: runId ? `/payroll/runs/${runId}` : "/payroll/runs",
                        }
                      : header?.status === "PENDING_APPROVAL"
                        ? {
                            label: "Review approval stages",
                            href: runId ? `/payroll/runs/${runId}` : "/payroll/runs",
                          }
                        : header?.status === "LOCKED"
                          ? {
                              label: "Go to bank transfers",
                              href: `/payroll/bank-transfers?runId=${runId ?? ""}`,
                            }
                          : header?.status === "PAID"
                            ? {
                                label: "Publish payslips",
                                href: runId ? `/payroll/runs/${runId}` : "/payroll/payslips",
                              }
                            : {
                                label: "Open run detail",
                                href: runId ? `/payroll/runs/${runId}` : "/payroll/runs",
                              }
                }
                summary={
                  header
                    ? `${header.employeeCount} employees · ${excCount} open exception(s)`
                    : undefined
                }
              />
              {header && (
                <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground px-1">
                  <Users className="h-3.5 w-3.5" />
                  <span className="payroll-money">{header.employeeCount} people this period</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
