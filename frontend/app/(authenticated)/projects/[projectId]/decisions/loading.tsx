import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { PM_TOOLBAR, PmPageShell, PmPanel } from "@/features/projects/shared/pm-chrome";
import { cn } from "@/lib/utils";

export default function ProjectDecisionsLoading() {
  return (
    <PageWrapper
      title="Decisions Log"
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
      filters={
        <div className={cn(PM_TOOLBAR)}>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-40 rounded-md" />
            <Skeleton className="h-9 w-52 rounded-md" />
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
