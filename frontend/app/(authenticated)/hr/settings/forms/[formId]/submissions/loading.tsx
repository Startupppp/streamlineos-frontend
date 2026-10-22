import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function FormSubmissionsLoading() {
  return (
    <PageWrapper
      title="Form submissions"
      subtitle="Review submitted form responses"
    >
      <DataTableSkeleton rows={8} columns={5} />
    </PageWrapper>
  );
}
