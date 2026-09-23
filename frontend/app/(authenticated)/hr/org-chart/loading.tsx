import {
  FILTER_TOOLBAR_ROW,
} from "@/components/ui/content-fill-panel";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrgChartLoading() {
  return (
    <PageWrapper
      title="Organization chart"
      subtitle="Explore reporting lines without loading the entire workforce."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-full min-w-48 max-w-sm rounded-md" />
        </div>
      }
      noInternalScroll
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        {Array.from({ length: 9 }).map((_, skeletonIndex) => (
          <Skeleton key={skeletonIndex} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </PageWrapper>
  );
}
