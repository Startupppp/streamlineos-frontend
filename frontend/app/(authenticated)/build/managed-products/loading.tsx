import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { PmPageShell } from "@/features/build/shared/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function ManagedProductsLoading() {
  return (
    <PageWrapper
      title="Managed Products"
      subtitle="Track products and link projects to them"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-40 rounded-md" />
          <Skeleton className="h-9 w-52 rounded-md" />
        </div>
      }
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
    >
      <PmPageShell>
        <DataTableSkeleton rows={12} columns={6} />
      </PmPageShell>
    </PageWrapper>
  );
}
