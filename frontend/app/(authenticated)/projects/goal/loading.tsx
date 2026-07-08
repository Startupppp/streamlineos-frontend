import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function GoalsLoading() {
  return (
    <PageWrapper
      title="Goals & OKRs"
      eyebrow="Projects"
      subtitle="Track company, team, and individual objectives and their key results"
      actions={<Skeleton className="h-8 w-28 rounded-md" />}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </PageWrapper>
  );
}
