import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function SignBulkSendLoading() {
  return (
    <PageWrapper title="Bulk Send" subtitle="Send one template to a list of people via CSV">
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </PageWrapper>
  );
}
