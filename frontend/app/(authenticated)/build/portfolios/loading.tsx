import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { PmPageShell } from "@/components/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

const HEADERS = ["Name", "Status", "Health", "Owner", "Projects", "Strategic goal", "Actions"] as const;

export default function PortfoliosLoading() {
  return (
    <PageWrapper
      title="Portfolios"
      subtitle="Group related projects into portfolios"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-40 rounded-md" />
          <Skeleton className="h-9 w-52 rounded-md" />
        </div>
      }
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
    >
      <PmPageShell>
        <DataTableSkeleton mobileCards rows={12} headers={HEADERS} className="flex-1 min-h-0" />
      </PmPageShell>
    </PageWrapper>
  );
}
