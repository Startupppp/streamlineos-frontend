import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function CrmDealsAgingLoading() {
  return (
    <PageWrapper
      title="Deal Aging Report"
      subtitle="Deals by time without progression"
      backHref="/crm/deals"
      actions={<Skeleton className="h-9 w-24 rounded-md" />}
    >
      <div className="space-y-4">
        <StatCardGridSkeleton cols={4} count={4} />
        <DataTableSkeleton rows={12} columns={8} />
      </div>
    </PageWrapper>
  );
}
