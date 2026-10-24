import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { SignDashboardSkeleton } from "@/features/sign/dashboard/sign-dashboard-skeleton";

export default function SignDashboardLoading() {
  return (
    <PageWrapper
      title="Sign OS"
      subtitle="Envelopes, signatures, and completion status at a glance"
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-hide"
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
    >
      <SignDashboardSkeleton />
    </PageWrapper>
  );
}
