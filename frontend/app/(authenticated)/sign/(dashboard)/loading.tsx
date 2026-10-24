import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { SignDashboardSkeleton } from "@/features/sign/dashboard/sign-dashboard-skeleton";

export default function SignDashboardLoading() {
  return (
    <PageWrapper
      title="Sign OS"
      subtitle="Envelopes, signatures, and completion status at a glance"
      actions={<Skeleton className="h-9 w-full max-w-full rounded-md sm:w-36" />}
    >
      <SignDashboardSkeleton />
    </PageWrapper>
  );
}
