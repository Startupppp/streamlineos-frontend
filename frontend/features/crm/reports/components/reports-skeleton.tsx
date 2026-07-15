import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { PageWrapper } from "@/components/ui/page-wrapper";

export function ReportsSkeleton() {
  return (
    <PageWrapper
      title="Reports"
      subtitle="Sales performance and pipeline analytics"
    >
      <div className="space-y-6">
        <StatCardGridSkeleton cols={4} count={12} />
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="bg-card rounded-lg border border-border shadow-sm p-4 space-y-3"
            >
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-40 w-full" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
