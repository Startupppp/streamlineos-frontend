import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export function LoansPageSkeleton() {
  return (
    <PageWrapper
      title="Loans & Advances"
      subtitle="Manage employee salary advances and loan EMI recovery."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-44 rounded-md" />
        </div>
      }
    >
      <DataTableSkeleton rows={12} columns={6} />
    </PageWrapper>
  );
}

export default function Loading() {
  return <LoansPageSkeleton />;
}
