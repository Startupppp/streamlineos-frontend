import { PageWrapper } from "@/components/ui/page-wrapper";
import { SkeletonTable } from "@/components/shared/skeletons/skeleton-table";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChangeRequestsLoading() {
  const filtersBar = (
    <div className="flex items-center gap-2">
      <Skeleton className="h-7 w-44 rounded-md" />
      <Skeleton className="h-7 w-40 rounded-md" />
    </div>
  );

  return (
    <PageWrapper
      title="Change Requests"
      eyebrow="Project"
      actions={<Skeleton className="h-7 w-40 rounded-md" />}
      filters={filtersBar}
    >
      <div className="px-4 pb-4">
        <SkeletonTable rows={6} columns={7} />
      </div>
    </PageWrapper>
  );
}
