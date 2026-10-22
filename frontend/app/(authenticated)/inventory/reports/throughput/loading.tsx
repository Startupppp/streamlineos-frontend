import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function ThroughputLoading() {
  return (
    <PageWrapper
      title="Operations SLA"
      subtitle="Receiving, picking and shipping across the selected window."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-64" />
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <StatCardGridSkeleton cols={4} />
        <StatCardGridSkeleton cols={3} />
        <StatCardGridSkeleton cols={3} />
      </div>
    </PageWrapper>
  );
}
