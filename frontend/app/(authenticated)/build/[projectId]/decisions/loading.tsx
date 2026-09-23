import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { PmPageShell, PmPanel } from "@/components/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

const HEADERS = ["ID", "Title", "Status", "Owner", "Decided", "Revisit", "Actions"] as const;

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
          <DataTableSkeleton mobileCards rows={12} headers={HEADERS} className="flex-1 min-h-0" />
        </PmPanel>
      </PmPageShell>
    </PageWrapper>
  );
}
