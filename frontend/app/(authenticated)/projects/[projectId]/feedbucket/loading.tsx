import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { PmPageShell } from "@/features/projects/shared/pm-chrome";

export default function ProjectFeedbackLoading() {
  return (
    <PageWrapper
      title="Feedback"
      subtitle="Collect and triage user feedback submitted via this project's widget."
    >
      <PmPageShell>
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </PmPageShell>
    </PageWrapper>
  );
}
