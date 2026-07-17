import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function CrmDealsForecastLoading() {
  return (
    <PageWrapper
      title="Deal Forecast"
      subtitle="Pipeline forecast and revenue projection"
      backHref="/crm/deals"
    >
      <div className="space-y-4">
        <StatCardGridSkeleton cols={3} count={3} />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </PageWrapper>
  );
}
