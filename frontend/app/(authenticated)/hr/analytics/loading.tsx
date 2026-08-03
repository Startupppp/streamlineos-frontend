import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function HrAnalyticsLoading() {
  return (
    <PageWrapper
      title="HR Analytics"
      subtitle="Workforce insights and operational metrics"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <StatCardGridSkeleton cols={4} count={4} />

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-24 rounded-md" />
            ))}
          </div>
          <Skeleton className="ml-auto h-9 w-36 rounded-md" />
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="p-4 flex min-h-0 flex-1 flex-col gap-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Skeleton className="h-[220px] rounded-xl" />
              <Skeleton className="h-[220px] rounded-xl" />
            </div>
            <Skeleton className="h-[180px] rounded-xl" />
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
