"use client";

import { useState } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared";
import { MonthPicker } from "@/features/payroll/shared/month-picker";
import { formatMonth } from "@/features/payroll/shared/payroll-format";
import { InputsTab } from "@/features/payroll/runs/inputs-tab";
import { usePayrollRuns } from "@/hooks/api/payroll/runs";
import { EmptyPayroll } from "@/components/illustrations";

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function InputsPageContent() {
  const [month, setMonth] = useState(currentYearMonth);
  const { data: runsData, isLoading, error, refetch } = usePayrollRuns({ page: 1, limit: 100 });

  const currentRun = runsData?.data.find((r) => r.month === month);
  const LOCKED_STATUSES = new Set(["LOCKED", "PAID", "PAYSLIPS_PUBLISHED", "CLOSED"]);
  const isLocked = currentRun ? LOCKED_STATUSES.has(currentRun.status) : false;

  if (error) {
    return (
      <PageWrapper title="Attendance Inputs" backHref="/payroll">
        <ErrorState
          title="Failed to load payroll runs"
          description="Could not load payroll data. Please try again."
          onRetry={refetch}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Attendance Inputs"
      subtitle={formatMonth(month)}
      backHref="/payroll"
      filters={
        <MonthPicker value={month} onChange={setMonth} yearRange={[-1, 0]} className="w-44" />
      }
    >
      {isLoading && (
        <div className="border border-border rounded-md overflow-hidden">
          <div className="h-8 bg-muted/40 border-b" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 border-b border-border px-3 flex items-center gap-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-4 w-16 rounded" />
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-3 w-10" />
              ))}
            </div>
          ))}
        </div>
      )}

      {!isLoading && !currentRun && (
        <EmptyState
          illustration={<EmptyPayroll />}
          title={`No payroll run for ${formatMonth(month)}`}
          description="Create a payroll run for this month to manage attendance inputs."
          action={{ label: "View runs", href: "/payroll/runs" }}
        />
      )}

      {!isLoading && currentRun && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>Payroll run:</span>
            <Link
              href={`/payroll/runs/${currentRun.id}`}
              className="text-blue-600 hover:underline font-medium"
            >
              {formatMonth(currentRun.month)} — {currentRun.status}
            </Link>
          </div>
          <InputsTab runId={currentRun.id} isLocked={isLocked} />
        </div>
      )}
    </PageWrapper>
  );
}
