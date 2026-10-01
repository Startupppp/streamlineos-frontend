import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function TimesheetsAccessLoading() {
  return (
    <PageWrapper title="Timesheets Access">
      <Skeleton className="h-9 w-64 rounded-md" />
      <DataTableSkeleton rows={8} headers={["Member", "Role", "Permissions", "Scope"]} />
    </PageWrapper>
  );
}
