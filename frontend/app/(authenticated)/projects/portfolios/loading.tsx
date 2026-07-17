import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import {
  PmPageShell,
  PM_TOOLBAR,
} from "@/features/projects/shared/pm-chrome";

export default function PortfoliosLoading() {
  return (
    <PageWrapper
      title="Portfolios"
      subtitle="Group related projects into portfolios"
      filters={
        <div className={PM_TOOLBAR}>
          <Skeleton className="h-9 w-40 rounded-md" />
          <Skeleton className="h-9 w-52 rounded-md" />
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
