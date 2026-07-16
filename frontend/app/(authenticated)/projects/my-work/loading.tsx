import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { PmPageShell, PmSection } from "@/features/projects/shared/pm-chrome";

export default function MyWorkLoading() {
  return (
    <PageWrapper title="My Work" subtitle="Your assigned tickets across all projects">
      <PmPageShell>
        <PmSection index={0}>
          <StatCardGridSkeleton cols={4} className="mb-4" />
        </PmSection>
        <PmSection index={1}>
          <div className="space-y-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
