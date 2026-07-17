import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { PM_TOOLBAR, PmPageShell, PmPanel } from "@/features/projects/shared/pm-chrome";
import { cn } from "@/lib/utils";

export default function BacklogLoading() {
  return (
    <PageWrapper
      title="Backlog"
      subtitle="Manage and prioritize unscheduled work"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
      filters={
        <div className={cn(PM_TOOLBAR, "sm:justify-end")}>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-44 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>
      }
    >
      <PmPageShell>
        <PmPanel className="min-w-0">
          <DataTableSkeleton rows={12} columns={7} />
        </PmPanel>
      </PmPageShell>
    </PageWrapper>
  );
}
