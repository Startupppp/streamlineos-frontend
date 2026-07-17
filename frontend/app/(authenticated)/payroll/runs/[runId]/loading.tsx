import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function PayrollRunDetailLoading() {
  return (
    <PageWrapper
      title="Payroll Run"
      subtitle="Loading run…"
      backHref="/payroll/runs"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <StatCardGridSkeleton cols={4} count={4} />
        <div className="flex gap-1 border-b border-border pb-0">
          <Skeleton className="h-9 w-28 rounded-t-md" />
          <Skeleton className="h-9 w-28 rounded-t-md" />
          <Skeleton className="h-9 w-24 rounded-t-md" />
          <Skeleton className="h-9 w-24 rounded-t-md" />
        </div>
        <DataTableSkeleton rows={12} columns={6} />
      </div>
    </PageWrapper>
  );
}
