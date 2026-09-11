import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell, PmSection } from "@/components/pm-chrome";

export default function MilestonesLoading() {
  return (
    <PageWrapper
      title="Milestones"
      subtitle="Key checkpoints and target dates for this project"
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
    >
      <PmPageShell>
        <PmSection index={0}>
          <StatCardGridSkeleton cols={4} />
        </PmSection>
        <PmSection index={1}>
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
