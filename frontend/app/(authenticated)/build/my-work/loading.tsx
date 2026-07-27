import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { PmPageShell, PmPanel, PmSection } from "@/features/build/shared/pm-chrome";

export default function MyWorkLoading() {
  return (
    <PageWrapper title="My Work" subtitle="Your assigned tickets across all projects">
      <PmPageShell>
        <PmSection index={0}>
          <StatCardGridSkeleton cols={4} className="mb-4" />
        </PmSection>
        <PmSection index={1}>
          <div className="flex gap-1">
            <Skeleton className="h-9 w-20 rounded-md" />
            <Skeleton className="h-9 w-20 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-20 rounded-md" />
          </div>
          <PmPanel className="p-2">
            <div className="space-y-1.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          </PmPanel>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
