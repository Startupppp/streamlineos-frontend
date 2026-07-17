import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export function ComponentsPageSkeleton() {
  return (
    <PageWrapper
      title="Component Catalog"
      subtitle="Manage salary components used in payroll runs."
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-48 rounded-md" />
          <Skeleton className="h-9 w-44 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      }
    >
      <DataTableSkeleton rows={12} columns={5} />
    </PageWrapper>
  );
}

export default function Loading() {
  return <ComponentsPageSkeleton />;
}
