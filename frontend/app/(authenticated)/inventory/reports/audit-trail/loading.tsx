import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function InventoryAuditTrailLoading() {
  return (
    <PageWrapper
      title="Audit Trail"
      subtitle="Who changed which inventory record, and when."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-52" />
          <Skeleton className="h-9 w-52" />
          <Skeleton className="h-9 w-[160px]" />
          <Skeleton className="h-9 w-[160px]" />
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <DataTableSkeleton rows={10} columns={5} className="flex-1 min-h-0" />
      </div>
    </PageWrapper>
  );
}
