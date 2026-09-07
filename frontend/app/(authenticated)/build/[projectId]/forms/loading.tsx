import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { PmPageShell, PmSection } from "@/components/pm-chrome/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function ProjectFormsLoading() {
  return (
    <PageWrapper
      title="Forms"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-40 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      }
      actions={<Skeleton className="h-9 w-24 rounded-md" />}
    >
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          <DataTableSkeleton rows={12} columns={6} />
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
