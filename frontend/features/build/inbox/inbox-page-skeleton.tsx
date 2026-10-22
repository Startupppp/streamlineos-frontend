import { PageWrapper } from "@/components/ui/page-wrapper";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { PmPageShell, PmSection, PM_FILL_SECTION } from "@/components/pm-chrome";
import { cn } from "@/lib/utils";
import { InboxListSkeleton } from "./inbox-list-skeleton";

export function InboxPaneSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-2 py-1.5">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-8 min-w-0 flex-1 rounded-md" />
        ))}
      </div>
      <div className="flex gap-2 border-b border-border px-3 py-2">
        <Skeleton className="h-9 min-w-0 flex-1 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
      <InboxListSkeleton />
    </div>
  );
}

export function InboxPageSkeleton() {
  return (
    <PageWrapper
      title="Inbox"
      subtitle="Project updates, assignments, mentions and approvals"
      noInternalScroll
    >
      <PmPageShell>
        <PmSection index={0} className={cn(PM_FILL_SECTION, CONTENT_PANEL_SOLID)}>
          <div className="flex h-full min-h-0">
            <div className="w-full min-w-0 lg:w-[42%] lg:border-r lg:border-border">
              <InboxPaneSkeleton />
            </div>
            <div className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
              <Skeleton className="h-5 w-48 rounded-md" />
            </div>
          </div>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
