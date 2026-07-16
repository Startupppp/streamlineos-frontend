import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import {
  PmPageShell,
  PmSection,
  PM_TOOLBAR,
} from "@/features/projects/shared/pm-chrome";

export default function IncidentsLoading() {
  return (
    <PageWrapper
      title="Incidents"
      subtitle="Track incidents and SLA compliance"
      filters={
        <div className={PM_TOOLBAR}>
          <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
            <Skeleton className="h-9 w-44 rounded-md" />
            <Skeleton className="h-9 w-36 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </div>
      }
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <PmPageShell>
        <PmSection index={0} className="shrink-0">
          <StatCardGridSkeleton cols={3} count={3} />
        </PmSection>

        <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
          <DataTableSkeleton rows={12} columns={7} className="flex-1" />
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
