import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function SupportAiReportLoading() {
  return (
    <PageWrapper
      title="AI Report"
      subtitle="Support AI performance metrics — acceptance, resolution, escalation, and CSAT impact"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-16 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-16 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
        <StatCardGridSkeleton count={7} />
      </div>
    </PageWrapper>
  );
}
