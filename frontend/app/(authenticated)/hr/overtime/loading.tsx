import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function OvertimeLoading() {
  return (
    <PageWrapper
      title="Overtime & Comp-Off"
      subtitle="Manage overtime requests and compensatory leave balances"
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
    >
      <div className="flex flex-1 min-h-0 flex-col">
        <div className="flex gap-2 shrink-0 mb-4">
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
        <DataTableSkeleton rows={6} columns={5} />
      </div>
    </PageWrapper>
  );
}
