import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { PmPageShell, PmSection } from "@/features/projects/shared/pm-chrome";

export default function AutomationsLoading() {
  return (
    <PageWrapper
      title="Automations"
      subtitle="Automate repetitive actions with if-then rules"
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
    >
      <PmPageShell>
        <PmSection index={0}>
          <StatCardGridSkeleton cols={2} className="mb-4" />
        </PmSection>
        <PmSection index={1} className="flex min-h-0 flex-1 flex-col gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
