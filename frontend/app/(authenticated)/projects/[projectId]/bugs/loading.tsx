import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { PM_TOOLBAR, PmPageShell, PmSection } from "@/features/projects/shared/pm-chrome";
import { cn } from "@/lib/utils";

export default function BugsLoading() {
  return (
    <PageWrapper
      title="Bugs"
      subtitle="Track and triage project bugs"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
      filters={
        <div className={cn(PM_TOOLBAR, "w-full")}>
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
            <Skeleton className="h-9 w-44 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        </div>
      }
    >
      <PmPageShell>
        <PmSection index={0}>
          <DataTableSkeleton rows={12} columns={7} />
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
