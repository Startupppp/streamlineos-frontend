import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { WikiTableRowsSkeleton } from "@/features/wiki/components/wiki-collection-skeletons";

export default function TrashLoading() {
  return (
    <PageWrapper
      title="Trash"
      subtitle="Deleted pages can be restored or permanently removed"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-full rounded-md sm:w-64" />
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-52 rounded-md" />
          <Skeleton className="h-9 w-40 rounded-md" />
          <Skeleton className="h-9 w-40 rounded-md" />
        </div>
        <WikiTableRowsSkeleton />
      </div>
    </PageWrapper>
  );
}
