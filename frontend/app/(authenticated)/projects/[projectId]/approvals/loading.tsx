import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { PM_TOOLBAR, PmPageShell, PmPanel, PmSection } from "@/features/projects/shared/pm-chrome";
import { cn } from "@/lib/utils";

export default function ProjectApprovalsLoading() {
  return (
    <PageWrapper
      title="Approvals"
      subtitle="Review and manage approval requests for this project"
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
      filters={
        <div className={cn(PM_TOOLBAR, "w-full")}>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-40 rounded-md" />
            <Skeleton className="h-9 w-40 rounded-md" />
          </div>
        </div>
      }
    >
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          <PmPanel className="p-2">
            <DataTableSkeleton rows={12} columns={7} className="flex-1" />
          </PmPanel>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
