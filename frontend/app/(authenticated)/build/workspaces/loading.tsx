import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { PmPageShell } from "@/components/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function PmWorkspacesLoading() {
  return (
    <PageWrapper
      title="PM Workspaces"
      subtitle="Group products, teams and projects under a workspace"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-40 rounded-md" />
          <Skeleton className="h-9 w-52 rounded-md" />
        </div>
      }
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
    >
      <PmPageShell>
        <DataTableSkeleton rows={12} columns={4} />
      </PmPageShell>
    </PageWrapper>
  );
}
