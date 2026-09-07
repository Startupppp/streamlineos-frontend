"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, DollarSign, Calendar } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useWorkforceCostSummary,
  useCostByDepartment,
  useCostByLocation,
} from "@/hooks/api/hr/enterprise-comp";

function formatCents(v: unknown): string {
  const n = Number(v);
  if (isNaN(n)) return "—";
  return `$${(n / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function WorkforceCostPage() {
  const canView = useCan("hr:analytics:read");
  const [periodKey, setPeriodKey] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`);
  const [periodInput, setPeriodInput] = useState(periodKey);

  const { data: summary, isLoading: summaryLoading, isError: summaryIsError, error: summaryError, refetch: refetchSummary } = useWorkforceCostSummary();
  const { data: byDept, isLoading: deptLoading, isError: deptIsError, error: deptError, refetch: refetchDept } = useCostByDepartment(periodKey);
  const { data: byLoc, isLoading: locLoading, isError: locIsError, error: locError, refetch: refetchLoc } = useCostByLocation();

  function handleRetrySummary() { void refetchSummary(); }
  function handleRetryDept() { void refetchDept(); }
  function handleRetryLoc() { void refetchLoc(); }

  if (!canView) {
    return (
      <PageWrapper title="Workforce Costing" subtitle="Cost analytics by department and location">
        <p className="text-sm text-muted-foreground">You do not have permission to view workforce cost data.</p>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Workforce Costing"
      subtitle="Real-time cost breakdown by department and location"
    >
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
            <StatCard label="Monthly Cost" value={formatCents(summary?.totalMonthlyCostCents)} hint="All active employees" icon={DollarSign} tone="emerald" />
            <StatCard label="Annual CTC" value={formatCents(summary?.totalAnnualCtcCents)} hint="Total compensation" icon={Calendar} tone="blue" />
          </StatCardGrid>
        )}

        <div className="flex items-center gap-3">
          <Input
            className="w-36 text-sm"
            placeholder="YYYY-MM"
            value={periodInput}
            onChange={(e) => setPeriodInput(e.target.value)}
          />
          <Button variant="outline" size="sm" onClick={() => setPeriodKey(periodInput)}>
            Apply
          </Button>
        </div>

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
                {byDept.map((row, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">{String(row.departmentName ?? "—")}</p>
                      <p className="text-xs text-muted-foreground">{String(row.headcount ?? 0)} employees</p>
                    </div>
                    <p className="text-sm font-bold text-primary">{formatCents(row.monthlyCostCents)}/mo</p>
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
                {byLoc.map((row, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">{String(row.locationId === "unassigned" ? "Unassigned" : `Location ${row.locationId}`)}</p>
                      <p className="text-xs text-muted-foreground">{String(row.headcount ?? 0)} employees</p>
                    </div>
                    <p className="text-sm font-bold text-primary">{formatCents(row.monthlyCostCents)}/mo</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </PageWrapper>
  );
}
