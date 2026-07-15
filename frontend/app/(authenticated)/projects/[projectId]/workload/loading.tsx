import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function WorkloadLoading() {
  return (
    <PageWrapper title="Workload" subtitle="Team capacity and ticket distribution">
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <Skeleton className="h-4 w-32 shrink-0" />
              <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                <Skeleton className="h-full rounded" style={{ width: `${20 + (i * 17) % 60}%` }} />
              </div>
              <Skeleton className="h-3.5 w-16 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
