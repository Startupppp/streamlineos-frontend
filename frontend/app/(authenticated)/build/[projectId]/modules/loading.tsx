import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { PmPageShell, PmSection } from "@/components/pm-chrome/pm-chrome";

export default function ModulesLoading() {
  return (
    <PageWrapper
      title="Modules"
      subtitle="Organize work into feature groups and track module progress"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
    >
      <PmPageShell>
        <PmSection index={0}>
          <StatCardGridSkeleton cols={4} count={4} />
        </PmSection>
        <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[148px] rounded-xl" />
            ))}
          </div>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
