import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function InventoryAllocationOverridesLoading() {
  return (
    <PageWrapper
      title="Allocation overrides"
      subtitle="Every time an expiry rule was set aside for a lot, and the reason given."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-52" />
          <Skeleton className="h-9 w-[160px]" />
          <Skeleton className="h-9 w-[160px]" />
        </div>
      }
    >
      <DataTableSkeleton rows={12} columns={6} />
    </PageWrapper>
  );
}
