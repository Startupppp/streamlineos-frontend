import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function HrWorkforceLoading() {
  return (
    <PageWrapper
      title="Workforce Planning"
      subtitle="Headcount plans and organizational capacity"
    >
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        <StatCardGridSkeleton cols={4} count={4} />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-44 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
        <DataTableSkeleton rows={10} headers={["Department", "Budgeted", "Actual", "Variance"]} />
      </div>
    </PageWrapper>
  );
}
