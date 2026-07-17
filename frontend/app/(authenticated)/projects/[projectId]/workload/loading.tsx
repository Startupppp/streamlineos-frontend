import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import { PmPageShell, PmSection, PM_PANEL } from "@/features/projects/shared/pm-chrome";

export default function WorkloadLoading() {
  return (
    <PageWrapper
      title="Workload"
      subtitle="Team capacity and ticket distribution"
    >
      <PmPageShell>
        <PmSection index={0}>
          <StatCardGridSkeleton cols={4} className="mb-4" />
        </PmSection>
        <PmSection index={1}>
          <div className={cn(PM_PANEL, "space-y-2 p-2")}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-border/40 px-2 py-3 last:border-0"
              >
                <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
                <Skeleton className="h-4 w-32 shrink-0" />
                <div className="flex-1 overflow-hidden rounded">
                  <Skeleton
                    className="h-5 rounded"
                    style={{ width: `${20 + ((i * 17) % 60)}%` }}
                  />
                </div>
                <Skeleton className="h-3.5 w-16 shrink-0" />
              </div>
            ))}
          </div>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
