import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { PmPageShell, PmPanel, PM_TOOLBAR } from "@/features/projects/shared/pm-chrome";
import { cn } from "@/lib/utils";

export default function TimelineLoading() {
  return (
    <PageWrapper
      title="Timeline"
      subtitle="Visual schedule of work items, dependencies, and milestones"
      noInternalScroll
      contentClassName="!p-0"
    >
      <PmPageShell className="h-full min-h-0 px-4 pb-4 pt-0 sm:px-6">
        <div className={cn(PM_TOOLBAR, "h-10 animate-pulse bg-muted/30")} />
        <PmPanel className="flex min-h-0 flex-1 flex-col p-3">
          <div className="mb-3 flex items-center gap-2 border-b border-border/50 pb-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-3.5 w-12 shrink-0" />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5">
              <Skeleton className="h-7 w-28 shrink-0 rounded-md sm:w-40" />
              <Skeleton
                className="h-7 rounded-md"
                style={{
                  width: `${30 + ((i * 13) % 50)}%`,
                  marginLeft: `${(i * 7) % 30}%`,
                }}
              />
            </div>
          ))}
        </PmPanel>
      </PmPageShell>
    </PageWrapper>
  );
}
