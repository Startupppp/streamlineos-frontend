import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function EquityLoading() {
  return (
    <PageWrapper
      title="Equity & ESOP"
      subtitle="Manage equity grants, vesting schedules, and exercises"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-5">
          <DataTableSkeleton rows={10} headers={["Employee", "Type", "Units", "Grant Date", "Cliff", "Vesting", "Status", "Board Approved"]} />
        </div>
      </div>
    </PageWrapper>
  );
}
