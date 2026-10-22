import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell, PmSection } from "@/components/pm-chrome";
import { Skeleton } from "@/components/ui/skeleton";

const MEMBER_HEADERS = ["Name", "Role", "Added", "Teams", "Actions"] as const;

export function BuildAccessLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex gap-2 px-4 py-3">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <PageWrapper title="Members" subtitle="People who can access Build, and their roles.">
        <PmPageShell>
          <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
            <DataTableSkeleton mobileCards rows={12} headers={MEMBER_HEADERS} fill />
          </PmSection>
        </PmPageShell>
      </PageWrapper>
    </div>
  );
}
