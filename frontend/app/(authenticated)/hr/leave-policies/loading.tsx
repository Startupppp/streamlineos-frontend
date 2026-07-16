import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function LeavePoliciesLoading() {
  return (
    <PageWrapper
      title="Leave Policies"
      subtitle="Define accrual and carry-forward rules per leave type"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-52 rounded-lg" />
        ))}
      </div>
    </PageWrapper>
  );
}
