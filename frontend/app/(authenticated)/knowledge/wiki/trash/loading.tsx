import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import {
  WikiFillTable,
} from "@/features/wiki/components/wiki-collection-skeletons";

export default function TrashLoading() {
  return (
    <PageWrapper
      title="Trash"
      subtitle="Deleted pages can be restored or permanently removed"
      actions={
        <Skeleton className="h-9 w-full min-w-0 rounded-md sm:w-28 sm:flex-none" />
      }
      filters={
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
          <Skeleton className="h-9 min-w-0 flex-1 rounded-md sm:max-w-xs" />
          <Skeleton className="size-9 shrink-0 rounded-md md:h-9 md:w-auto md:min-w-20" />
        </div>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-48 max-w-full" />
          </div>
          <Skeleton className="h-5 w-14 shrink-0" />
          <Skeleton className="size-8 shrink-0 rounded-md" />
        </div>
        <WikiFillTable headers={["Page", "Deleted"]} />
      </div>
    </PageWrapper>
  );
}
