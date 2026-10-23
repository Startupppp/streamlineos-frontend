import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import {
  WIKI_LOADING_CONTENT_CLASS,
  WikiTemplatesGridSkeleton,
} from "@/features/wiki/components/wiki-collection-skeletons";

export default function TemplatesLoading() {
  return (
    <PageWrapper
      title="Templates"
      subtitle="Built-in skeletons ready to use"
      noInternalScroll
      contentClassName={WIKI_LOADING_CONTENT_CLASS}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex shrink-0 flex-col gap-2 md:flex-row md:items-center">
          <div className="flex h-9 w-fit items-center gap-1 rounded-lg bg-muted p-1">
            <Skeleton className="h-7 w-20 rounded-md" />
            <Skeleton className="h-7 w-16 rounded-md" />
          </div>
          <div className="flex min-w-0 items-center gap-2 md:ml-auto">
            <Skeleton className="h-9 w-full rounded-md sm:w-64" />
            <Skeleton className="h-9 w-56 shrink-0 rounded-md" />
          </div>
        </div>
        <WikiTemplatesGridSkeleton />
      </div>
    </PageWrapper>
  );
}
