import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { PmPageShell, PM_PANEL } from "@/features/projects/shared/pm-chrome";
import { cn } from "@/lib/utils";

export default function CommandCenterLoading() {
  return (
    <PageWrapper
      title="Command Center"
      subtitle="Overview of your projects and active work"
    >
      <PmPageShell>
        <div className="shrink-0">
          <StatCardGridSkeleton cols={3} />
        </div>
        <Skeleton className={cn("h-56 w-full shrink-0 rounded-xl", PM_PANEL)} />
        <Skeleton className={cn("h-48 w-full shrink-0 rounded-xl", PM_PANEL)} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn("h-28 w-full rounded-xl", PM_PANEL)}
            />
          ))}
        </div>
      </PmPageShell>
    </PageWrapper>
  );
}
