import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function WinLossLoading() {
  return (
    <PageWrapper title="Win/Loss Analysis" subtitle="Deal outcome breakdown and lost reason attribution">
      <div className="space-y-6">
        <StatCardGridSkeleton cols={4} count={4} />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    </PageWrapper>
  );
}
