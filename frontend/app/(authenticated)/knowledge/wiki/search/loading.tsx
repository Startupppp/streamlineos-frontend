import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import {
  WIKI_LOADING_CONTENT_CLASS,
  WikiSearchResultsSkeleton,
} from "@/features/wiki/components/wiki-collection-skeletons";

export default function SearchFilesLoading() {
  return (
    <PageWrapper title="Search" noInternalScroll contentClassName={WIKI_LOADING_CONTENT_CLASS}>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
          <Skeleton className="h-9 min-w-0 flex-1 rounded-md" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-40 rounded-md" />
            <Skeleton className="h-9 w-40 rounded-md" />
            <Skeleton className="h-9 w-40 rounded-md" />
            <Skeleton className="h-9 w-16 rounded-md" />
          </div>
        </div>
        <WikiSearchResultsSkeleton />
      </div>
    </PageWrapper>
  );
}
