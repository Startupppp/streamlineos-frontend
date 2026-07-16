import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function PayrollRunsLoading() {
  return (
    <PageWrapper
      title="Payroll Runs"
      backHref="/payroll"
      actions={<Skeleton className="h-9 w-24 rounded-md" />}
    >
      <DataTableSkeleton rows={12} columns={6} />
    </PageWrapper>
  );
}
