import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { PmPageShell, PmSection } from "@/components/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

const HEADERS = ["ID", "Title", "Priority", "Automation", "Component", "Actions"] as const;

export default function QaLoading() {
  return (
    <PageWrapper title="QA / Tests" subtitle="Test cases, suites, and execution runs">
      <PmPageShell>
        <PmSection index={0}>
          <div className={FILTER_TOOLBAR_ROW}>
            <Skeleton className="h-9 w-48 rounded-md" />
            <Skeleton className="h-9 w-36 rounded-md" />
            <div className="ml-auto flex gap-0.5">
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          </div>
          <DataTableSkeleton rows={12} headers={HEADERS} className="flex-1 min-h-0" />
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
