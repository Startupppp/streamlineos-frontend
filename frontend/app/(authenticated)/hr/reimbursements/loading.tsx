import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function ReimbursementsLoading() {
  return (
    <PageWrapper
      title="Reimbursements"
      subtitle="Submit and track expense reimbursements"
      actions={<Skeleton className="h-9 w-[120px] rounded-md" />}
    >
      <DataTableSkeleton rows={12} headers={["Employee", "Category", "Description", "Date", "Status", "Amount", ""]} className="flex-1 min-h-0" />
    </PageWrapper>
  );
}
