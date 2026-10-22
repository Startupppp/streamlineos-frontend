import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { WikiTableRowsSkeleton } from "@/features/wiki/components/wiki-collection-skeletons";

export default function ReviewsLoading() {
  return (
    <PageWrapper
      title="Reviews"
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-full rounded-md sm:w-64" />
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      }
    >
      <WikiTableRowsSkeleton />
    </PageWrapper>
  );
}
