import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function CompaniesLoading() {
  return (
    <PageWrapper
      title="Companies"
      subtitle="Your company directory"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 flex-1 max-w-md rounded-md" />
          <Skeleton className="h-9 w-28 shrink-0 rounded-md" />
        </div>
      }
    >
      <DataTableSkeleton rows={12} columns={6} className="flex-1" />
    </PageWrapper>
  );
}
