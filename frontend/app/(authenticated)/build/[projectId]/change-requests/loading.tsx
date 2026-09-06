import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { PmPageShell, PmSection } from "@/features/build/shared/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function ChangeRequestsLoading() {
  return (
    <PageWrapper
      title="Change Requests"
      actions={<Skeleton className="h-9 w-40 rounded-md" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-44 rounded-md" />
          <Skeleton className="h-9 w-40 rounded-md" />
        </div>
      }
    >
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          <DataTableSkeleton rows={12} columns={7} />
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
