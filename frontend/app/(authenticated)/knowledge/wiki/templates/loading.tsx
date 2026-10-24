import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { WikiTemplatesGridSkeleton } from "@/features/wiki/components/wiki-collection-skeletons";

export default function TemplatesLoading() {
  return (
    <PageWrapper
      title="Templates"
      subtitle="Built-in skeletons ready to use"
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <div className="flex w-full min-w-0 flex-col gap-2 md:flex-row md:items-center">
          <div className="flex h-9 w-full items-center gap-1 rounded-lg bg-muted p-1 md:w-fit">
            <Skeleton className="h-7 min-w-0 flex-1 rounded-md md:w-20 md:flex-none" />
            <Skeleton className="h-7 min-w-0 flex-1 rounded-md md:w-16 md:flex-none" />
          </div>
          <div className="flex w-full min-w-0 items-center gap-2 md:ml-auto md:w-auto">
            <Skeleton className="h-9 min-w-0 flex-1 rounded-md sm:max-w-xs" />
            <Skeleton className="h-9 min-w-0 flex-1 rounded-md sm:max-w-56 sm:flex-none sm:w-56" />
          </div>
        </div>
        <WikiTemplatesGridSkeleton />
      </div>
    </PageWrapper>
  );
}
