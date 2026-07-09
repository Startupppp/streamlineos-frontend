import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectFeedbackLoading() {
  return (
    <PageWrapper eyebrow="Project" title="Feedback" subtitle="Collect and triage user feedback submitted via this project's widget.">
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24 rounded" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
