import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { SpaceCardSkeleton } from "@/features/wiki/components/space-card";
import {
  WIKI_LOADING_CONTENT_CLASS,
  WikiActionsSkeleton,
} from "@/features/wiki/components/wiki-collection-skeletons";

export default function TeamFoldersLoading() {
  return (
    <PageWrapper
      title="Team folders"
      subtitle="Organize your docs into team folders"
      actions={<WikiActionsSkeleton />}
      noInternalScroll
      contentClassName={WIKI_LOADING_CONTENT_CLASS}
    >
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
        <div className="grid w-full shrink-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <div className="col-span-2 flex min-w-0 items-center gap-2 sm:contents">
            <Skeleton className="h-9 min-w-0 flex-1 rounded-md sm:max-w-48" />
            <Skeleton className="h-9 w-16 shrink-0 rounded-md sm:order-last sm:ml-auto" />
          </div>
          <Skeleton className="h-9 w-full rounded-md sm:w-36" />
          <Skeleton className="h-9 w-full rounded-md sm:w-36" />
        </div>
        <div className="grid min-h-0 w-full min-w-0 flex-1 grid-cols-1 gap-4 overflow-hidden sm:grid-cols-2 lg:grid-cols-3 [grid-auto-rows:minmax(11rem,1fr)]">
          {Array.from({ length: 18 }, (_, index) => (
            <SpaceCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
