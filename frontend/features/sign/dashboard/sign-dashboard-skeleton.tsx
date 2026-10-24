"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { SignReportsSkeleton } from "@/features/sign/reports/reports-page";

export function SignDashboardSkeleton({ includeReports = true }: { includeReports?: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      <StatCardGridSkeleton cols={5} count={5} />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3 p-6 pt-6">
              <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-44" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-40" />
            </div>
          ))}
        </div>
      </div>
      {includeReports ? <SignReportsSkeleton /> : null}
    </div>
  );
}
