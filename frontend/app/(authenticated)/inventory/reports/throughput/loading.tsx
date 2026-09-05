import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

/**
 * The same three stat bands the dashboard renders while its own query is in
 * flight — SLA targets, then receiving, picking and shipping. Keeping the
 * segment fallback identical to the in-component one means the screen does not
 * change shape when the boundary hands over.
 */
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
