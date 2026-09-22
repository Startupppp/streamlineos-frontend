import { PageWrapper } from "@/components/ui/page-wrapper";
import { SupportRequestsTableSkeleton } from "@/features/employee-support";

export default function EmployeeSupportLoading() {
  return (
    <PageWrapper
      title="Employee support"
      subtitle="Raise a request to HR, IT, Finance, Admin or Legal and follow it here."
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <SupportRequestsTableSkeleton surface="self" />
    </PageWrapper>
  );
}
