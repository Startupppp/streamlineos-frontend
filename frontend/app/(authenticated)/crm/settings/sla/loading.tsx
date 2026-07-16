import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function SlaLoading() {
  return (
    <PageWrapper
      title="SLA Policies"
      subtitle="Service Level Agreement policies for leads and deals"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
    >
      <div className="space-y-6">
        <StatCardGridSkeleton cols={4} count={4} />
        <DataTableSkeleton rows={12} columns={5} />
      </div>
    </PageWrapper>
  );
}
