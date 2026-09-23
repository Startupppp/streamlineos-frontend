import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { PmPageShell, PmSection, PM_FILL_PANEL } from "@/components/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

const HEADERS = ["Name", "Key", "Members", "Actions"] as const;

export default function TeamsLoading() {
  return (
    <PageWrapper
      title="Teams"
      subtitle="Organise members into cross-functional teams"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-52 rounded-md" />
        </div>
      }
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          <DataTableSkeleton mobileCards rows={12} headers={HEADERS} className={PM_FILL_PANEL} />
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
