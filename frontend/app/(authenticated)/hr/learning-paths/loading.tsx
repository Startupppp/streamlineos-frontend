import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function LearningPathsLoading() {
  return (
    <PageWrapper
      title="Learning Paths"
      subtitle="Structured learning programs and career development"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    </PageWrapper>
  );
}
