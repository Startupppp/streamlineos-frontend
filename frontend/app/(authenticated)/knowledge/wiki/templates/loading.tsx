import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { WikiTemplatesGridSkeleton } from "@/features/wiki/components/wiki-collection-skeletons";

export default function TemplatesLoading() {
  return (
    <PageWrapper
      title="Templates"
      subtitle="Built-in skeletons ready to use"
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-40 rounded-md" />
          <Skeleton className="h-9 min-w-48 flex-1 rounded-md" />
          <Skeleton className="h-9 w-56 rounded-md" />
        </div>
        <WikiTemplatesGridSkeleton />
      </div>
    </PageWrapper>
  );
}
