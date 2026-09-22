import { PageWrapper } from "@/components/ui/page-wrapper";
import { SupportRequestsTableSkeleton } from "@/features/employee-support";

export default function HrEmployeeSupportLoading() {
  return (
    <PageWrapper
      title="Employee support"
      subtitle="Company-wide requests routed to the HR, IT, Finance, Admin and Legal queues."
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <SupportRequestsTableSkeleton surface="agent" />
    </PageWrapper>
  );
}
