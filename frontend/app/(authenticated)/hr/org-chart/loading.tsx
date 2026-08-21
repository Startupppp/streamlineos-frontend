import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrgChartLoading() {
  return (
    <PageWrapper
      title="Organization chart"
      subtitle="Explore reporting lines without loading the entire workforce."
      filters={
        <Skeleton className="h-9 w-full min-w-48 max-w-sm rounded-md" />
      }
    >
      <div className="flex flex-1 flex-col gap-2">
        {Array.from({ length: 9 }).map((_, skeletonIndex) => (
          <Skeleton key={skeletonIndex} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </PageWrapper>
  );
}
