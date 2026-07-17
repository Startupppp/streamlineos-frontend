import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { PM_TOOLBAR, PmPageShell, PmPanel } from "@/features/projects/shared/pm-chrome";
import { cn } from "@/lib/utils";

export default function MyTicketsLoading() {
  return (
    <PageWrapper
      title="My Tickets"
      subtitle="Tickets assigned to or reported by you"
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
          <DataTableSkeleton rows={12} columns={6} />
        </PmPanel>
      </PmPageShell>
    </PageWrapper>
  );
}
