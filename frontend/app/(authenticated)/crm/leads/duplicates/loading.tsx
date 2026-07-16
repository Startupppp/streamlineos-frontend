import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function DuplicateLeadsLoading() {
  return (
    <PageWrapper title="Duplicate Lead Detection" subtitle="Fuzzy matching to find potential duplicate leads">
      <div className="space-y-6">
        <StatCardGridSkeleton cols={2} count={2} />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
