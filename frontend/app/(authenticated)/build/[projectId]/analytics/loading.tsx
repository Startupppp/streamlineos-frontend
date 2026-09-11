import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { PmPageShell, PmPanel } from "@/components/pm-chrome";

export default function AnalyticsLoading() {
  return (
    <PageWrapper title="Analytics" subtitle="Project health, velocity, and performance charts">
      <PmPageShell>
        <StatCardGridSkeleton cols={6} className="mb-4" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <PmPanel key={i} className="p-4">
              <Skeleton className="mb-3 h-4 w-32" />
              <Skeleton className="h-[296px] w-full rounded-md" />
            </PmPanel>
          ))}
        </div>
      </PmPageShell>
    </PageWrapper>
  );
}
