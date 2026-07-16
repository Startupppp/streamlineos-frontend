import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { PmPageShell, PmSection } from "@/features/projects/shared/pm-chrome";

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
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-28 w-full rounded-lg" />
            </div>
            <div className="border-t pt-6 space-y-2">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
            <div className="border-t pt-6 space-y-2">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          </div>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
