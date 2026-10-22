import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";

const QUEUE_ROWS = [1, 2, 3, 4, 5] as const;

export default function ServiceDeliveryLoading() {
  return (
    <PageWrapper
      title="Service delivery"
      subtitle="Unified HR ops inbox"
    >
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <StatCardGridSkeleton cols={4} count={4} />
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <Skeleton className="h-4 w-36" />
            <div className="flex gap-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="divide-y divide-border">
            {QUEUE_ROWS.map((n) => (
              <div key={n} className="px-3 py-2.5 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-20 font-mono" />
                  <Skeleton className="h-4 w-16 rounded" />
                </div>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
