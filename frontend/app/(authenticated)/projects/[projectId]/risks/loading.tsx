import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { PM_TOOLBAR, PmPageShell, PmSection } from "@/features/projects/shared/pm-chrome";
import { cn } from "@/lib/utils";

export default function ProjectRisksLoading() {
  return (
    <PageWrapper
      title="Risk Register"
      subtitle="Identify, assess, and mitigate project risks"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <PmPageShell>
        <PmSection index={0}>
          <StatCardGridSkeleton cols={3} className="mb-4" />
        </PmSection>
        <PmSection index={1}>
          <div className={cn(PM_TOOLBAR, "mb-3")}>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-36 rounded-md" />
              <Skeleton className="h-9 w-36 rounded-md" />
            </div>
          </div>
          <DataTableSkeleton rows={12} columns={8} />
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
