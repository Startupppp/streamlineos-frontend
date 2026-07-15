import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function CrmCampaignsLoading() {
  return (
    <PageWrapper title="Campaigns" subtitle="Track lead sources and ROI">
      <div className="space-y-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </PageWrapper>
  );
}
