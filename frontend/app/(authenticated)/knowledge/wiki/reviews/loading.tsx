import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import {
  WIKI_LOADING_CONTENT_CLASS,
  WikiFillTable,
} from "@/features/wiki/components/wiki-collection-skeletons";

const REVIEW_HEADERS = ["Page", "Type", "Status", "Reviewer", "Due date", "Requested by", ""] as const;

export default function ReviewsLoading() {
  return (
    <PageWrapper
      title="Reviews"
      noInternalScroll
      contentClassName={WIKI_LOADING_CONTENT_CLASS}
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-full rounded-md sm:w-[200px]" />
          <Skeleton className="h-9 w-full rounded-md sm:w-[140px]" />
          <Skeleton className="h-9 w-full rounded-md sm:w-[130px]" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      }
    >
      <WikiFillTable headers={REVIEW_HEADERS} />
    </PageWrapper>
  );
}
