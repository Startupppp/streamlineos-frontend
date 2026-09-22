import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function PayrollEmployeesLoading() {
  return (
    <PageWrapper
      title="Salary Profiles"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      }
    >
      <DataTableSkeleton rows={12} headers={["Employee", "Type", "Annual CTC", "Status", "Effective From", "Currency"]} />
    </PageWrapper>
  );
}
