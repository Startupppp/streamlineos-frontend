import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function ApprovalsInboxLoading() {
  return (
    <PageWrapper title="Approvals Inbox" eyebrow="Projects" variant="display">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
    </PageWrapper>
  );
}
