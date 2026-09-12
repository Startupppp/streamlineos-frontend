import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function InspectionPlansLoading() {
  return (
    <PageWrapper
      title="Inspection plans"
      subtitle="Arrivals a plan covers are held out of available stock until a verdict."
      actions={<Skeleton className="h-9 w-32" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 min-w-0 flex-1 lg:max-w-md" />
          <Skeleton className="h-9 w-44 shrink-0" />
        </div>
      }
    >
      <DataTableSkeleton rows={10} columns={7} />
    </PageWrapper>
  );
}
