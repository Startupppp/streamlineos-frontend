import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function PerformanceAnalyticsLoading() {
  return (
    <PageWrapper
      title="Performance Analytics"
      subtitle="Review cycle insights and metrics"
      backHref="/hr/performance"
      actions={<div className="h-9 w-32 rounded-md bg-muted animate-pulse" />}
    >
      <div className="space-y-4">
        <StatCardGridSkeleton cols={4} count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-lg border border-border p-6 h-72 animate-pulse" />
          <div className="bg-card rounded-lg border border-border p-6 h-72 animate-pulse" />
        </div>
        <div className="bg-card border border-border rounded-lg p-6 h-52 animate-pulse" />
      </div>
    </PageWrapper>
  );
}
