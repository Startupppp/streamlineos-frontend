import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { PmPageShell } from "@/features/projects/shared/pm-chrome";

export default function EpicsLoading() {
  return (
    <PageWrapper title="Epics">
      <PmPageShell>
        <div className="space-y-4">
          <StatCardGridSkeleton cols={4} />
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      </PmPageShell>
    </PageWrapper>
  );
}
