import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell, PmSection, PM_PANEL } from "@/features/projects/shared/pm-chrome";
import { cn } from "@/lib/utils";

export default function RunExecutionLoading() {
  return (
    <PageWrapper eyebrow="Quality" title="Test Run" subtitle="Test run execution">
      <PmPageShell>
        <PmSection index={0}>
          <Skeleton className={cn("h-10 w-full rounded-xl", PM_PANEL)} />
        </PmSection>
        <PmSection index={1}>
          <div className="space-y-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className={cn("h-20 rounded-xl", PM_PANEL)} />
            ))}
          </div>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
