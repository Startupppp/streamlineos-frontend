import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { PmPageShell, PM_PANEL } from "@/components/pm-chrome/pm-chrome";
import { cn } from "@/lib/utils";

export default function ApprovalsInboxLoading() {
  return (
    <PageWrapper title="Approvals" subtitle="Approvals waiting for your decision across all projects">
      <PmPageShell>
        <StatCardGridSkeleton cols={2} />
        <Skeleton className={cn("h-48 rounded-xl", PM_PANEL)} />
      </PmPageShell>
    </PageWrapper>
  );
}
