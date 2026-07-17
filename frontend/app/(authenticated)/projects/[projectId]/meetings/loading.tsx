import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import {
  PmPageShell,
  PmSection,
  PM_PANEL,
  PM_TOOLBAR,
} from "@/features/projects/shared/pm-chrome";
import { cn } from "@/lib/utils";

export default function MeetingsLoading() {
  return (
    <PageWrapper
      title="Meetings"
      subtitle="Schedule meetings, standups, and retros for your project"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
      filters={
        <div className={cn(PM_TOOLBAR, "w-full")}>
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
            <Skeleton className="h-9 w-36 rounded-md" />
            <Skeleton className="h-9 w-36 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
            <Skeleton className="h-9 w-40 rounded-md" />
          </div>
        </div>
      }
    >
      <PmPageShell>
        <PmSection index={0} className="shrink-0">
          <Skeleton className={cn("h-14 w-full rounded-xl", PM_PANEL)} />
        </PmSection>
        <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
          <DataTableSkeleton rows={12} columns={9} className="flex-1" />
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
