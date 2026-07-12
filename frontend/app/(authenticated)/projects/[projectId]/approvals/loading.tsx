import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectApprovalsLoading() {
  const filtersBar = (
    <div className="flex items-center gap-2">
      <Skeleton className="h-8 w-40 rounded-md" />
      <Skeleton className="h-8 w-40 rounded-md" />
    </div>
  );

  return (
    <PageWrapper
      title="Approvals"
      eyebrow="Project"
      actions={<Skeleton className="h-8 w-36 rounded-md" />}
      filters={filtersBar}
    >
      <div className="px-4 pb-4">
        <SkeletonTable rows={6} columns={7} />
      </div>
    </PageWrapper>
  );
}
