import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { WikiFillTable } from "@/features/wiki/components/wiki-collection-skeletons";

const REVIEW_HEADERS = ["Page", "Type", "Status", "Reviewer", "Due date", "Requested by", ""] as const;

export default function ReviewsLoading() {
  return (
    <PageWrapper
      title="Reviews"
      filters={
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          <Skeleton className="col-span-2 h-9 w-full rounded-md sm:col-auto sm:w-[200px]" />
          <Skeleton className="h-9 w-full rounded-md sm:w-[140px]" />
          <Skeleton className="h-9 w-full rounded-md sm:w-[130px]" />
          <Skeleton className="col-span-2 h-9 w-full rounded-md sm:col-auto sm:w-28" />
        </div>
      }
    >
      <WikiFillTable headers={REVIEW_HEADERS} />
    </PageWrapper>
  );
}
