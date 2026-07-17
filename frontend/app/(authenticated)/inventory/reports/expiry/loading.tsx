import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function ExpiryReportLoading() {
  return (
    <PageWrapper
      title="Expiry Report"
      subtitle="Lots approaching or past their expiry date within the selected window"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-[160px]" />
          <Skeleton className="h-9 w-[160px]" />
          <Skeleton className="h-9 w-[180px]" />
          <Skeleton className="h-9 w-32" />
        </div>
      }
    >
      <DataTableSkeleton rows={10} columns={7} className="flex-1 min-h-0" />
    </PageWrapper>
  );
}
