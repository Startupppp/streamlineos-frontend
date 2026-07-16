import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function SalesOrdersLoading() {
  return (
    <PageWrapper
      title="Sales Orders"
      subtitle="Manage customer sales orders from creation to invoicing."
      actions={<Skeleton className="h-9 w-28" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-[160px]" />
          <Skeleton className="h-9 w-[150px]" />
          <Skeleton className="h-9 w-[150px]" />
        </div>
      }
    >
      <DataTableSkeleton rows={10} className="flex-1 min-h-0" />
    </PageWrapper>
  );
}
