import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { PM_PANEL } from "@/features/projects/shared/pm-chrome";
import { cn } from "@/lib/utils";

export default function ApprovalsInboxLoading() {
  return (
    <PageWrapper title="Approvals" subtitle="Approvals waiting for your decision across all projects">
      <div className="relative flex min-h-0 flex-1 flex-col gap-4">
        <StatCardGridSkeleton cols={2} />
        <Skeleton className={cn("h-48 rounded-xl", PM_PANEL)} />
      </div>
    </PageWrapper>
  );
}
