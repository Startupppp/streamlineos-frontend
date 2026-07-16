import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function HrAnalyticsLoading() {
  return (
    <PageWrapper
      title="HR Analytics"
      subtitle="Workforce insights and operational metrics"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      }
    >
      <div className="space-y-5">
        <StatCardGridSkeleton cols={4} count={4} />
        <div className="grid md:grid-cols-2 gap-5">
          <Skeleton className="h-[240px] rounded-xl" />
          <Skeleton className="h-[240px] rounded-xl" />
        </div>
        <Skeleton className="h-[200px] rounded-xl" />
      </div>
    </PageWrapper>
  );
}
