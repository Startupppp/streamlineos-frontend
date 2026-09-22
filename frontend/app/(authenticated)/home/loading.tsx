import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function HomeLoading() {
  return (
    <PageWrapper title="Home">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <StatCardGridSkeleton cols={4} count={4} />
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
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
