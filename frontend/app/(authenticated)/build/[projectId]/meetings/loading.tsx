import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { PmPageShell, PmSection, PM_PANEL } from "@/components/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";

const HEADERS = ["ID", "Title", "Type", "Status", "Date", "Host", "Attendees", "Notes", "Actions"] as const;

export default function MeetingsLoading() {
  return (
    <PageWrapper
      title="Meetings"
      subtitle="Schedule meetings, standups, and retros for your project"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-40 rounded-md" />
        </div>
      }
    >
      <PmPageShell>
        <PmSection index={0} className="shrink-0">
          <Skeleton className={cn("h-14 w-full rounded-xl", PM_PANEL)} />
        </PmSection>
        <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
          <DataTableSkeleton mobileCards rows={12} headers={HEADERS} className="flex-1 min-h-0" />
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
