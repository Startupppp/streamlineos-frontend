import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function JobsLoading() {
  return (
    <PageWrapper
      title="Job Postings"
      subtitle="Create and manage open positions"
      actions={<Skeleton className="h-8 w-32 rounded-md" />}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
        <DataTableSkeleton rows={6} columns={6} />
      </div>
    </PageWrapper>
  );
}
