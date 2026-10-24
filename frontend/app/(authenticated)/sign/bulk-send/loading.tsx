import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { BulkSendListSkeleton } from "@/features/sign/bulk-send/bulk-send-list-skeleton";

export default function SignBulkSendLoading() {
  return (
    <PageWrapper
      title="Bulk Send"
      subtitle="Send one template to a list of people via CSV"
      actions={<Skeleton className="h-9 w-full max-w-full rounded-md sm:w-36" />}
    >
      <BulkSendListSkeleton />
    </PageWrapper>
  );
}
