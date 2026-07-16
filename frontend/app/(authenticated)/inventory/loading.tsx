import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function InventoryDashboardLoading() {
  return (
    <PageWrapper
      title="Inventory Dashboard"
      subtitle="Track stock levels, movements, and reorder alerts."
      actions={<Skeleton className="h-9 w-28" />}
    >
      <div className="space-y-6">
        <StatCardGridSkeleton cols={4} count={7} />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Skeleton className="h-64 rounded-xl lg:col-span-3" />
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
        </div>
      </div>
    </PageWrapper>
  );
}
