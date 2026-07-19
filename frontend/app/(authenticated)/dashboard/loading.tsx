import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function DashboardLoading() {
  return (
    <PageWrapper
      title="Dashboard"
      subtitle="Loading your workspace…"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <StatCardGridSkeleton cols={4} count={4} />

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-col items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-3 grid-cols-1 lg:grid-cols-7">
          <div className="lg:col-span-4 rounded-xl border border-border bg-card p-4 space-y-3">
            <Skeleton className="h-5 w-28" />
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
          <div className="lg:col-span-3 rounded-xl border border-border bg-card p-4 space-y-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-20 w-full rounded" />
          </div>
        </div>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <Skeleton className="h-5 w-32" />
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="h-10 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
