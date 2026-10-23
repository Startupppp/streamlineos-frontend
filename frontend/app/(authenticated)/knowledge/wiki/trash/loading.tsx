import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import {
  WIKI_LOADING_CONTENT_CLASS,
  WikiFillTable,
} from "@/features/wiki/components/wiki-collection-skeletons";

export default function TrashLoading() {
  return (
    <PageWrapper
      title="Trash"
      subtitle="Deleted pages can be restored or permanently removed"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
      noInternalScroll
      contentClassName={WIKI_LOADING_CONTENT_CLASS}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="h-9 w-full max-w-sm rounded-md sm:w-64" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
        <WikiFillTable headers={["Page", "Deleted"]} />
      </div>
    </PageWrapper>
  );
}
