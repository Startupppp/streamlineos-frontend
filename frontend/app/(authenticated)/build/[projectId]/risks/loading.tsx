import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { PmPageShell, PmSection } from "@/features/build/shared/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

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
          <div className={FILTER_TOOLBAR_ROW}>
            <Skeleton className="h-9 w-40 rounded-md" />
            <Skeleton className="h-9 w-52 rounded-md" />
          </div>
          <DataTableSkeleton rows={12} columns={8} />
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
