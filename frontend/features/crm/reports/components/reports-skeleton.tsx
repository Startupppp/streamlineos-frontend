import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { PageWrapper } from "@/components/ui/page-wrapper";

export function ReportsSkeleton() {
  return (
    <PageWrapper
      title="Reports"
      subtitle="Sales performance and pipeline analytics"
    >
      <div className="space-y-6">
        <div className="bg-card rounded-lg border border-border shadow-sm p-4">
          <StatCardGrid cols={4}>
            <StatCard label="Total Leads" value="" isLoading />
            <StatCard label="Active Deals" value="" isLoading />
            <StatCard label="Pipeline Value" value="" isLoading />
            <StatCard label="Won Revenue" value="" isLoading />
          </StatCardGrid>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card rounded-lg border border-border shadow-sm p-4 space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-48 w-full" />
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
