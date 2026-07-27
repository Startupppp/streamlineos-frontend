import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { PmPageShell, PmPanel } from "@/features/build/shared/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function ProjectDecisionsLoading() {
  return (
    <PageWrapper
      title="Decisions Log"
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-40 rounded-md" />
          <Skeleton className="h-9 w-52 rounded-md" />
        </div>
      }
    >
      <PmPageShell>
        <PmPanel className="min-w-0">
          <DataTableSkeleton rows={12} columns={7} />
        </PmPanel>
      </PmPageShell>
    </PageWrapper>
  );
}
