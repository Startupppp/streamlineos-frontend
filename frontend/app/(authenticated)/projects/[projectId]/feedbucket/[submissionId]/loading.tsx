import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectFeedbackSubmissionLoading() {
  return (
    <PageWrapper eyebrow="Project" title="Submission">
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </PageWrapper>
  );
}
