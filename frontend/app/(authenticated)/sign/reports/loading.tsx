import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function SignReportsLoading() {
  return (
    <PageWrapper
      title="Reports"
      subtitle="Envelope activity, completion rates, and usage across SignOS."
    >
      <div className="flex flex-col gap-4">
        <StatCardGridSkeleton cols={4} count={4} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
