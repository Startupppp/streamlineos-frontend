import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";

/** Pagination footer that matches DataTablePagination layout */
export function PaginationSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-1",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-8 w-[70px] rounded-md" />
      </div>
      <div className="flex items-center gap-1">
        <Skeleton className="h-7 w-7 rounded-md" />
        <Skeleton className="h-7 w-7 rounded-md" />
        <Skeleton className="h-7 w-7 rounded-md hidden sm:block" />
        <Skeleton className="h-7 w-7 rounded-md hidden sm:block" />
        <Skeleton className="h-7 w-7 rounded-md hidden sm:block" />
        <Skeleton className="h-7 w-7 rounded-md" />
        <Skeleton className="h-7 w-7 rounded-md" />
      </div>
    </div>
  );
}

/** Matches EmployeeCard layout (directory grid) */
export function EmployeeCardSkeleton() {
  return (
    <div className="h-full rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden border-l-4 border-l-border">
      <div className="p-4 flex flex-col items-center text-center gap-3">
        <Skeleton className="h-16 w-16 rounded-full mt-1 ring-2 ring-border" />
        <div className="w-full space-y-1.5 flex flex-col items-center">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
    </div>
  );
}

/** Matches CandidateCardSkeleton page placement + filters + pagination */
export function CandidateCardPageSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card border-l-4 border-l-muted p-3 space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="h-11 w-11 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}

/** Matches job posting cards on /hr/recruitment/jobs */
export function JobCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 min-w-0 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full shrink-0" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-16 rounded-md" />
      </div>
    </div>
  );
}

/** Ticket row used by helpdesk */
export function TicketRowSkeleton() {
  return (
    <div className="px-4 py-3 flex items-start gap-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-3 w-14 shrink-0" />
    </div>
  );
}

type HrPageSkeletonProps = {
  title: string;
  subtitle?: string;
  actionCount?: number;
  filterCount?: number;
  children: ReactNode;
};

export function HrPageSkeletonShell({
  title,
  subtitle,
  actionCount = 2,
  filterCount = 0,
  children,
}: HrPageSkeletonProps) {
  return (
    <PageWrapper
      title={title}
      subtitle={subtitle}
      actions={
        actionCount > 0 ? (
          <div className="flex items-center gap-2">
            {Array.from({ length: actionCount }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-md" />
            ))}
          </div>
        ) : undefined
      }
      filters={
        filterCount > 0 ? (
          <div className="flex flex-wrap items-center gap-2 w-full">
            {Array.from({ length: filterCount }).map((_, i) => (
              <Skeleton
                key={i}
                className={cn("h-8 rounded-md", i === 0 ? "w-60" : "w-32")}
              />
            ))}
          </div>
        ) : undefined
      }
    >
      {children}
    </PageWrapper>
  );
}

/** Standard table page: filters + table + pagination */
export function HrTablePageSkeleton({
  title,
  subtitle,
  actionCount = 1,
  filterCount = 3,
  rows = 12,
  columns = 6,
}: {
  title: string;
  subtitle?: string;
  actionCount?: number;
  filterCount?: number;
  rows?: number;
  columns?: number;
}) {
  return (
    <HrPageSkeletonShell
      title={title}
      subtitle={subtitle}
      actionCount={actionCount}
      filterCount={filterCount}
    >
      <div className="space-y-3">
        <DataTableSkeleton rows={rows} columns={columns} className="rounded-2xl" />
        <PaginationSkeleton />
      </div>
    </HrPageSkeletonShell>
  );
}

/** Card grid page + pagination (employees directory, candidates, jobs) */
export function HrCardGridPageSkeleton({
  title,
  subtitle,
  actionCount = 2,
  filterCount = 3,
  card,
  count = 15,
  colsClassName = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
}: {
  title: string;
  subtitle?: string;
  actionCount?: number;
  filterCount?: number;
  card: ReactNode;
  count?: number;
  colsClassName?: string;
}) {
  return (
    <HrPageSkeletonShell
      title={title}
      subtitle={subtitle}
      actionCount={actionCount}
      filterCount={filterCount}
    >
      <div className="space-y-4">
        <div className={cn("grid gap-3", colsClassName)}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i}>{card}</div>
          ))}
        </div>
        <PaginationSkeleton />
      </div>
    </HrPageSkeletonShell>
  );
}

/** Tabs + list (helpdesk style) */
export function HrTabsListSkeleton({
  title,
  subtitle,
  tabCount = 2,
}: {
  title: string;
  subtitle?: string;
  tabCount?: number;
}) {
  return (
    <PageWrapper title={title} subtitle={subtitle}>
      <div className="space-y-4">
        <div className="flex items-center gap-1">
          {Array.from({ length: tabCount }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-md" />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
        <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <TicketRowSkeleton key={i} />
          ))}
        </div>
        <PaginationSkeleton />
      </div>
    </PageWrapper>
  );
}

/** Stats chips + dual queue panels (recruitment command center) */
export function HrCommandCenterSkeleton({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <PageWrapper
      title={title}
      subtitle={subtitle}
      actions={<Skeleton className="h-8 w-24 rounded-md" />}
    >
      <div className="space-y-5">
        <div className="flex items-center gap-2 overflow-hidden">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-28 rounded-lg shrink-0" />
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-4 items-start">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-16" />
                </div>
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-3 px-5 py-3 border-b last:border-0">
                    <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-36" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </Card>
            ))}
          </div>
          <Card className="rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b">
              <Skeleton className="h-4 w-28" />
            </div>
            <CardContent className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}

/** HR dashboard overview strip above employees table */
export function HrDashboardOverviewSkeleton() {
  return (
    <div className="space-y-4 mb-4">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)]">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <Skeleton className="h-7 w-12" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)]">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-7 w-7 rounded-lg" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-3 w-10" />
              </div>
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-2.5 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/** Employee table skeleton matching HrEmployeeTable columns */
export function EmployeeTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden">
      <CardContent className="p-0">
        <div className="border-b px-4 py-3 flex items-center gap-6 bg-muted/40">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3.5 w-40 hidden md:block" />
          <Skeleton className="h-3.5 w-24 hidden lg:block" />
          <Skeleton className="h-3.5 w-20 hidden lg:block" />
          <Skeleton className="h-3.5 w-16 ml-auto" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-6 px-4 py-3.5 border-b last:border-0"
          >
            <div className="flex items-center gap-3 min-w-[200px]">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-20 md:hidden" />
              </div>
            </div>
            <Skeleton className="h-3.5 w-44 hidden md:block" />
            <Skeleton className="h-3.5 w-28 hidden lg:block" />
            <Skeleton className="h-5 w-16 rounded-full hidden lg:block" />
            <Skeleton className="h-7 w-8 rounded-md ml-auto" />
          </div>
        ))}
        <div className="px-4 border-t">
          <PaginationSkeleton />
        </div>
      </CardContent>
    </Card>
  );
}
