import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function ReportingRequestsLoading() {
  return (
    <PageWrapper title="Reporting requests" subtitle="Employees asking HR to correct who they report to">
      <DataTableSkeleton rows={8} headers={["Employee", "Current manager", "Suggested manager", "Status", "Submitted"]} />
    </PageWrapper>
  );
}
