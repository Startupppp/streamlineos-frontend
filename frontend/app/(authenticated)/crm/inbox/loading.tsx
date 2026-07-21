import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function InboxLoading() {
  return (
    <PageWrapper title="Sales Inbox" subtitle="Your daily command center">
      <div className="space-y-3">
        <StatCardGridSkeleton cols={4} count={4} className="mb-4" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </PageWrapper>
  );
}
