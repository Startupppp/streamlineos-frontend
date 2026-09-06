import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function ProductsLoading() {
  return (
    <PageWrapper
      title="Product Catalog"
      subtitle="Manage products and services offered in your CRM deals"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-[240px] rounded-md" />
        </div>
      }
    >
      <DataTableSkeleton rows={12} columns={6} />
    </PageWrapper>
  );
}
