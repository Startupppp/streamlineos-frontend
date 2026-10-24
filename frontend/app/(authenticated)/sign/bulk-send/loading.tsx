import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { BulkSendListSkeleton } from "@/features/sign/bulk-send/bulk-send-list-skeleton";

export default function SignBulkSendLoading() {
  return (
    <PageWrapper
      title="Bulk Send"
      subtitle="Send one template to a list of people via CSV"
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
      actions={<Skeleton className="h-9 w-32 max-w-full rounded-md" />}
    >
      <BulkSendListSkeleton />
    </PageWrapper>
  );
}
