import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { PmPageShell, PmSection, PM_FILL_PANEL } from "@/features/projects/shared/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function TeamsLoading() {
  return (
    <PageWrapper
      title="Teams"
      subtitle="Organise members into cross-functional teams"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-52 rounded-md" />
        </div>
      }
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          <DataTableSkeleton rows={12} columns={4} className={PM_FILL_PANEL} />
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
