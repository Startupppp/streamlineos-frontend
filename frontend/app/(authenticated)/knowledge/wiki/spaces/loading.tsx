import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { SpaceCardSkeleton } from "@/features/wiki/components/space-card";
import { WIKI_LOADING_CONTENT_CLASS } from "@/features/wiki/components/wiki-collection-skeletons";

export default function TeamFoldersLoading() {
  return (
    <PageWrapper
      title="Team folders"
      subtitle="Organize your docs into team folders"
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
      noInternalScroll
      contentClassName={WIKI_LOADING_CONTENT_CLASS}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-48 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="ml-auto h-9 w-20 rounded-md" />
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden sm:grid-cols-2 lg:grid-cols-3 [grid-auto-rows:minmax(11rem,1fr)]">
          {Array.from({ length: 9 }, (_, index) => (
            <SpaceCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
