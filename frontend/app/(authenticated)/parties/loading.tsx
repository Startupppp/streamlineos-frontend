import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function PartiesLoading() {
  return (
    <PageWrapper
      title="Business Parties"
      subtitle="Customers, vendors and partners"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 flex-1 min-w-[12rem] rounded-md" />
          <Skeleton className="h-9 w-36 shrink-0 rounded-md" />
        </div>
      }
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <DataTableSkeleton rows={12} columns={6} />
    </PageWrapper>
  );
}
