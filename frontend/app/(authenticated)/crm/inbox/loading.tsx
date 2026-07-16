import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function InboxLoading() {
  return (
    <PageWrapper title="Sales Inbox" subtitle="Your daily command center">
      <div className="space-y-4">
        <StatCardGridSkeleton cols={4} count={4} />
        <div className="space-y-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
