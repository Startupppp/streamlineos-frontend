import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function SharedFilesLoading() {
  return (
    <PageWrapper title="Shared with me" subtitle="Files explicitly shared with you">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-full rounded-md sm:w-72" />
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="ml-auto h-9 w-20 rounded-md" />
        </div>
        <DataTableSkeleton columns={8} mobileCards fill />
      </div>
    </PageWrapper>
  );
}
