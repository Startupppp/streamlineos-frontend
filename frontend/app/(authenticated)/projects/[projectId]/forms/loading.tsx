import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectFormsLoading() {
  const filtersBar = (
    <div className="flex items-center gap-2">
      <Skeleton className="h-8 w-36 rounded-md" />
      <Skeleton className="h-8 w-40 rounded-md" />
      <Skeleton className="h-8 w-32 rounded-md" />
    </div>
  );

  return (
    <PageWrapper
      title="Forms"
      filters={filtersBar}
      actions={<Skeleton className="h-8 w-24 rounded-md" />}
    >
      <div className="px-4 pb-4">
        <DataTableSkeleton rows={12} columns={6} />
      </div>
    </PageWrapper>
  );
}
