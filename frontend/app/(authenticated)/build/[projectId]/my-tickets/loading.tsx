import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { PmPageShell, PmPanel } from "@/components/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function MyTicketsLoading() {
  return (
    <PageWrapper
      title="My Tickets"
      subtitle="Tickets assigned to or reported by you"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-44 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      }
    >
      <PmPageShell>
        <PmPanel className="min-w-0">
          <DataTableSkeleton rows={12} columns={6} />
        </PmPanel>
      </PmPageShell>
    </PageWrapper>
  );
}
