import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function ProductsLoading() {
  return (
    <PageWrapper
      title="Product Catalog"
      subtitle="Manage products and services offered in your CRM deals"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
    >
      <div className="space-y-4">
        <Skeleton className="h-9 w-64 rounded-md" />
        <DataTableSkeleton rows={12} columns={6} />
      </div>
    </PageWrapper>
  );
}
