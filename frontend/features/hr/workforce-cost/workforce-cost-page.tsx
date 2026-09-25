"use client";

import { useState, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import { Users, DollarSign, Calendar } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatMoney, type MoneyDisplay } from "@/lib/format-utils";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import {
  useWorkforceCostSummary,
  useCostByDepartment,
  useCostByLocation,
} from "@/hooks/api/hr/enterprise-comp";

function formatCents(v: unknown, money: MoneyDisplay): string {
  const n = Number(v);
  if (v == null || isNaN(n)) return "—";
  return formatMoney(n / 100, money);
}

export function WorkforceCostPage() {
  const [periodKey, setPeriodKey] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`);
  const money = useOrgDisplay();

  const { data: summary, isLoading: summaryLoading, isError: summaryIsError, error: summaryError, refetch: refetchSummary } = useWorkforceCostSummary();
  const { data: byDept, isLoading: deptLoading, isError: deptIsError, error: deptError, refetch: refetchDept } = useCostByDepartment(periodKey);
  const { data: byLoc, isLoading: locLoading, isError: locIsError, error: locError, refetch: refetchLoc } = useCostByLocation();

  const pageState = usePageState({ permission: "hr:analytics:read", isLoading: summaryLoading, isError: summaryIsError, error: summaryError });

  function handleRetrySummary() { void refetchSummary(); }
  function handleRetryDept() { void refetchDept(); }
  function handleRetryLoc() { void refetchLoc(); }
  function handlePeriodChange(e: ChangeEvent<HTMLInputElement>) { setPeriodKey(e.target.value); }

  return (
    <PageWrapper
      title="Workforce costing"
      subtitle="Real-time cost breakdown by department and location"
    >
      <PageState resolution={pageState} loading={null} onRetry={handleRetrySummary} className="flex-1">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="flex flex-1 min-h-0 flex-col gap-4"
      >
        {summaryLoading ? (
          <StatCardGridSkeleton cols={3} />
        ) : summaryIsError ? (
          <ErrorState
            title="Couldn't load workforce cost summary"
            description={getErrorMessage(summaryError)}
            onRetry={handleRetrySummary}
            compact
          />
        ) : (
          <StatCardGrid cols={3}>
            <StatCard label="Total Headcount" value={String(summary?.totalHeadcount ?? "—")} hint="Active employees" icon={Users} tone="blue" />
            <StatCard label="Monthly Cost" value={formatCents(summary?.totalMonthlyCostCents, money)} hint="All active employees" icon={DollarSign} tone="emerald" />
            <StatCard label="Annual CTC" value={formatCents(summary?.totalAnnualCtcCents, money)} hint="Total compensation" icon={Calendar} tone="blue" />
          </StatCardGrid>
        )}

        <Input
          type="month"
          className="w-44"
          aria-label="Department cost period"
          value={periodKey}
          onChange={handlePeriodChange}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm font-semibold mb-3">Cost by Department</p>
            {deptLoading ? (
              <div className="space-y-2">{Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
            ) : deptIsError ? (
              <ErrorState
                title="Couldn't load cost by department"
                description={getErrorMessage(deptError)}
                onRetry={handleRetryDept}
                compact
              />
            ) : !byDept?.length ? (
              <EmptyState
                illustrationPreset="chart"
                title="No department cost data"
                description="Cost by department appears once employees have compensation recorded for this period."
                compact
              />
            ) : (
              <div className="space-y-2">
                {byDept.map((row) => (
                  <div key={row.departmentId ?? "unassigned"} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">{String(row.departmentName ?? "—")}</p>
                      <p className="text-xs text-muted-foreground">{String(row.headcount ?? 0)} employees</p>
                    </div>
                    <p className="text-sm font-bold tabular-nums text-primary">{formatCents(row.monthlyCostCents, money)}/mo</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm font-semibold mb-3">Cost by Location</p>
            {locLoading ? (
              <div className="space-y-2">{Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
            ) : locIsError ? (
              <ErrorState
                title="Couldn't load cost by location"
                description={getErrorMessage(locError)}
                onRetry={handleRetryLoc}
                compact
              />
            ) : !byLoc?.length ? (
              <EmptyState
                illustrationPreset="chart"
                title="No location cost data"
                description="Cost by location appears once employees are assigned to locations."
                compact
              />
            ) : (
              <div className="space-y-2">
                {byLoc.map((row) => (
                  <div key={String(row.locationId)} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">{String(row.locationId === "unassigned" ? "Unassigned" : `Location ${row.locationId}`)}</p>
                      <p className="text-xs text-muted-foreground">{String(row.headcount ?? 0)} employees</p>
                    </div>
                    <p className="text-sm font-bold tabular-nums text-primary">{formatCents(row.monthlyCostCents, money)}/mo</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
      </PageState>
    </PageWrapper>
  );
}
