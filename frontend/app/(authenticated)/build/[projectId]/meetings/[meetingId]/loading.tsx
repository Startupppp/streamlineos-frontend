import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { PmPageShell, PmSection, PM_PANEL } from "@/components/pm-chrome/pm-chrome";
import { cn } from "@/lib/utils";

export default function ProjectMeetingDetailLoading() {
  return (
    <PageWrapper title="Meeting" backHref="#">
      <PmPageShell>
        <PmSection index={0}>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </PmSection>
        <PmSection index={1}>
          <Skeleton className={cn("h-32 w-full rounded-xl", PM_PANEL)} />
          <Skeleton className={cn("h-40 w-full rounded-xl", PM_PANEL)} />
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
