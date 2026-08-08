import { Skeleton } from "@/components/ui/skeleton";
import { SeatsBlockSkeleton } from "@/features/billing/components/seats-block";
import { PlanUsageMetersSkeleton } from "@/features/billing/components/plan-usage-meters";

export function PlanTabSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-14 w-full rounded-lg" />
      <Skeleton className="h-9 w-52 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="min-h-[240px] rounded-xl" />
        ))}
      </div>
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-full max-w-xs" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
      <SeatsBlockSkeleton />
      <PlanUsageMetersSkeleton />
    </div>
  );
}

export function BillingPageSkeleton() {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Skeleton className="mb-4 h-9 w-full max-w-[360px] rounded-lg" />
      <PlanTabSkeleton />
    </div>
  );
}
