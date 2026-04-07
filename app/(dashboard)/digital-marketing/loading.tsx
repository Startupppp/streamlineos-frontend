import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function DigitalMarketingLoading() {
  return (
    <PageWrapper title="Digital Marketing" subtitle="Track your digital campaigns and analytics.">
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
        <Skeleton className="h-[400px] rounded-lg" />
      </div>
    </PageWrapper>
  );
}
