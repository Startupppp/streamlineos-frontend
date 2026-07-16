import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function CrmDealsForecastLoading() {
  return (
    <PageWrapper title="Deal Forecast" subtitle="Pipeline value and close-date projections">
      <div className="space-y-4">
        <StatCardGridSkeleton cols={3} count={3} />
        <DataTableSkeleton rows={12} columns={6} />
      </div>
    </PageWrapper>
  );
}
