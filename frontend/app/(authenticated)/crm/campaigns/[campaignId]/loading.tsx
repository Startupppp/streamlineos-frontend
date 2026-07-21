import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function CrmCampaignDetailLoading() {
  return (
    <PageWrapper title="Campaign" backHref="/crm/campaigns">
      <div className="space-y-4">
        <StatCardGridSkeleton cols={4} count={4} />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </PageWrapper>
  );
}
