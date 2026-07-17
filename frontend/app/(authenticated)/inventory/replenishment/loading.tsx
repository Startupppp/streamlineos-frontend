import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function ReplenishmentLoading() {
  return (
    <PageWrapper
      title="Replenishment"
      subtitle="Review suggestions and create draft purchase orders."
      actions={<Skeleton className="h-9 w-36" />}
    >
      <DataTableSkeleton rows={10} columns={10} className="flex-1 min-h-0" />
    </PageWrapper>
  );
}
