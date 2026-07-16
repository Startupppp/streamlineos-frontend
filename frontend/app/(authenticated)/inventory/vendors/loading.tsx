import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function VendorsLoading() {
  return (
    <PageWrapper
      title="Vendors"
      subtitle="Manage your suppliers and purchase order vendors."
      actions={<Skeleton className="h-9 w-32" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 flex-1 max-w-[448px]" />
          <Skeleton className="h-9 w-[140px]" />
        </div>
      }
    >
      <DataTableSkeleton rows={10} className="flex-1 min-h-0" />
    </PageWrapper>
  );
}
