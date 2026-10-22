import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function SearchFilesLoading() {
  return (
    <PageWrapper title="Search">
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Skeleton className="h-9 min-w-0 flex-1 rounded-md" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-40 rounded-md" />
            <Skeleton className="h-9 w-40 rounded-md" />
          </div>
        </div>
        <DataTableSkeleton columns={3} rows={6} mobileCards />
      </div>
    </PageWrapper>
  );
}
