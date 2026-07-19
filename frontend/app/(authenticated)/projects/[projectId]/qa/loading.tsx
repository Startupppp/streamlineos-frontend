import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { PmPageShell, PmSection } from "@/features/projects/shared/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

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
          <DataTableSkeleton rows={12} columns={5} className="flex-1" />
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
