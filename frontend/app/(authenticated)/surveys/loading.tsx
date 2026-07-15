import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function SurveysLoading() {
  return (
    <PageWrapper
      title="Surveys"
      eyebrow="Surveys"
      subtitle="Build surveys, quizzes, live polls, and lead forms."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </PageWrapper>
  );
}
