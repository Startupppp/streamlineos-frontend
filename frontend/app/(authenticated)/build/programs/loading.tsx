import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { PmPageShell } from "@/components/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function ProgramsLoading() {
  return (
    <PageWrapper
      title="Programs"
      subtitle="Coordinate related projects as a single program of work"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-52 rounded-md" />
          <Skeleton className="h-9 w-40 rounded-md" />
        </div>
      }
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
    >
      <PmPageShell>
        <DataTableSkeleton rows={12} columns={7} />
      </PmPageShell>
    </PageWrapper>
  );
}
