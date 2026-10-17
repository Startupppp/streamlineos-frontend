import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReportingManagerPolicyLoading() {
  return (
    <PageWrapper
      title="Reporting managers"
      subtitle="Who an employee reports to when onboarding or an import leaves the manager blank"
    >
      <div className="flex flex-col gap-4">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    </PageWrapper>
  );
}
