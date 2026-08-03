import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import { PmPageShell, PM_PANEL } from "@/features/build/shared/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function GoalsLoading() {
  return (
    <PageWrapper
      title="Goals & OKRs"
      subtitle="Track company, team, and individual objectives and their key results"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-full max-w-sm rounded-md" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-[130px] rounded-md" />
            <Skeleton className="h-9 w-[140px] rounded-md" />
          </div>
        </div>
      }
    >
      <PmPageShell>
        <StatCardGridSkeleton cols={4} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={cn(PM_PANEL, "space-y-3 p-4")}>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-1.5 w-full rounded-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </PmPageShell>
    </PageWrapper>
  );
}
