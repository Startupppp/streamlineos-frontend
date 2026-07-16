import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { PmPageShell, PmPanel, PmSection } from "@/features/projects/shared/pm-chrome";

export default function AnalyticsLoading() {
  return (
    <PageWrapper title="Analytics" subtitle="Project health, velocity, and performance charts">
      <PmPageShell>
        <PmSection index={0}>
          <StatCardGridSkeleton cols={6} className="mb-4" />
        </PmSection>
        <PmSection index={1}>
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <PmPanel key={i} className="p-4">
                <Skeleton className="mb-3 h-4 w-32" />
                <Skeleton className="h-48 w-full rounded-md" />
              </PmPanel>
            ))}
          </div>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
