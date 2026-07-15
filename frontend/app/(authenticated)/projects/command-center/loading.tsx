import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { PM_PANEL } from "@/features/projects/shared/pm-chrome";
import { cn } from "@/lib/utils";

export default function CommandCenterLoading() {
  return (
    <PageWrapper title="Command Center" subtitle="Overview of your projects and active work">
      <div className="space-y-6">
        <StatCardGridSkeleton cols={3} />
        <Skeleton className={cn("h-56 rounded-xl", PM_PANEL)} />
        <Skeleton className={cn("h-56 rounded-xl", PM_PANEL)} />
      </div>
    </PageWrapper>
  );
}
