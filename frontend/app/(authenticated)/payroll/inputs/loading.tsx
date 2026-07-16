import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function PayrollInputsLoading() {
  return (
    <PageWrapper
      title="Payroll Inputs"
      subtitle="Capture and lock HR data for payroll processing."
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-44 rounded-md" />
        </div>
      }
    >
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <DataTableSkeleton rows={12} columns={6} />
      </div>
    </PageWrapper>
  );
}
