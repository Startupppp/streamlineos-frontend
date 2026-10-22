import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function PoliciesSettingsLoading() {
  return (
    <PageWrapper
      title="Policies"
      subtitle="Manage HR leave, attendance, and time-off policies"
    >
      <DataTableSkeleton rows={8} columns={4} />
    </PageWrapper>
  );
}
