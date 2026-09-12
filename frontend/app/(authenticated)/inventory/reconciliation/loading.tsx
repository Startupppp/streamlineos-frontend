import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function ReconciliationLoading() {
  return (
    <PageWrapper
      title="Stock Reconciliation"
      subtitle="Compares the stock projection against the movements it is derived from."
      actions={
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Skeleton className="h-9 flex-1 sm:w-24 sm:flex-none" />
          <Skeleton className="h-9 flex-1 sm:w-40 sm:flex-none" />
        </div>
      }
      filters={<Skeleton className="h-9 w-48" />}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <StatCardGridSkeleton cols={3} count={3} />
        <DataTableSkeleton rows={10} columns={6} />
      </div>
    </PageWrapper>
  );
}
