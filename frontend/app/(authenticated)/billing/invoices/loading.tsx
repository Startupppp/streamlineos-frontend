import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function InvoicesLoading() {
  return (
    <PageWrapper
      title="Invoices"
      subtitle="Manage and track all invoices"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
      filters={<Skeleton className="h-9 w-40 rounded-md" />}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <StatCardGridSkeleton cols={4} />
        <DataTableSkeleton rows={10} columns={7} className="flex-1 min-h-0" />
      </div>
    </PageWrapper>
  );
}
