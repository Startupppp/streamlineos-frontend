import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell, PmSection } from "@/features/projects/shared/pm-chrome";

export default function SprintsLoading() {
  return (
    <PageWrapper
      title="Sprints"
      subtitle="Plan and track time-boxed iterations"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
    >
      <PmPageShell>
        <div className="space-y-5">
          <PmSection index={0}>
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          </PmSection>
          <div className="border-t border-border/50" />
          <PmSection index={1}>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          </PmSection>
        </div>
      </PmPageShell>
    </PageWrapper>
  );
}
