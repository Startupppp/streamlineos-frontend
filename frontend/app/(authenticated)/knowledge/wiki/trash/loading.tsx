import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import {
  WIKI_LOADING_CONTENT_CLASS,
  WikiActionsSkeleton,
  WikiFillTable,
} from "@/features/wiki/components/wiki-collection-skeletons";

export default function TrashLoading() {
  return (
    <PageWrapper
      title="Trash"
      subtitle="Deleted pages can be restored or permanently removed"
      actions={<WikiActionsSkeleton />}
      noInternalScroll
      contentClassName={WIKI_LOADING_CONTENT_CLASS}
    >
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
        <div className="flex w-full min-w-0 shrink-0 items-center gap-2">
          <Skeleton className="h-9 min-w-0 flex-1 rounded-md sm:w-64 sm:flex-none" />
          <Skeleton className="h-9 w-24 shrink-0 rounded-md" />
        </div>
        <WikiFillTable headers={["Page", "Deleted"]} />
      </div>
    </PageWrapper>
  );
}
