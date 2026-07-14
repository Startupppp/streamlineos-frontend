import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { PM_PANEL } from "@/features/projects/shared/pm-chrome";
import { cn } from "@/lib/utils";

export default function ApprovalsInboxLoading() {
  return (
    <PageWrapper title="Approvals" eyebrow="Projects" subtitle="Approvals waiting for your decision across all projects">
      <div className="relative flex min-h-0 flex-1 flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className={cn("h-16 rounded-xl", PM_PANEL)} />
          <Skeleton className={cn("h-16 rounded-xl", PM_PANEL)} />
        </div>
        <Skeleton className={cn("h-48 rounded-xl", PM_PANEL)} />
      </div>
    </PageWrapper>
  );
}
