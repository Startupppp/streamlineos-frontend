import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { PmPageShell, PmSection } from "@/components/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

const HEADERS = ["ID", "Title", "Severity", "Status", "Priority", "Assignee", "Actions"] as const;

export default function BugsLoading() {
  return (
    <PageWrapper
      title="Bugs"
      subtitle="Track and triage project bugs"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-44 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      }
    >
      <PmPageShell>
        <PmSection index={0}>
          <DataTableSkeleton rows={12} headers={HEADERS} className="flex-1 min-h-0" />
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
