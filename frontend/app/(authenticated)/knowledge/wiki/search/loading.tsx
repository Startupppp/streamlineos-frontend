import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { WikiSearchResultsSkeleton } from "@/features/wiki/components/wiki-collection-skeletons";

export default function SearchFilesLoading() {
  return (
    <PageWrapper
      title="Search"
      filters={
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <div className="col-span-2 flex min-w-0 items-center gap-2 sm:contents">
            <Skeleton className="h-9 min-w-0 flex-1 rounded-md sm:max-w-xs" />
            <Skeleton className="h-9 w-16 shrink-0 rounded-md sm:order-last sm:ml-auto" />
          </div>
          <Skeleton className="h-9 w-full rounded-md sm:w-40" />
          <Skeleton className="h-9 w-full rounded-md sm:w-40" />
          <Skeleton className="col-span-2 h-9 w-full rounded-md sm:col-span-1 sm:w-40" />
        </div>
      }
    >
      <WikiSearchResultsSkeleton />
    </PageWrapper>
  );
}
