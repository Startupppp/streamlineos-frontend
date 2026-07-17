import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { PM_TOOLBAR, PmPageShell, PmSection } from "@/features/projects/shared/pm-chrome";
import { cn } from "@/lib/utils";

export default function ChangeRequestsLoading() {
  return (
    <PageWrapper
      title="Change Requests"
      actions={<Skeleton className="h-9 w-40 rounded-md" />}
      filters={
        <div className={cn(PM_TOOLBAR)}>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-44 rounded-md" />
            <Skeleton className="h-9 w-40 rounded-md" />
          </div>
        </div>
      }
    >
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          <DataTableSkeleton rows={12} columns={7} />
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
