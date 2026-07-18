import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function ContactsLoading() {
  return (
    <PageWrapper
      title="Contacts"
      subtitle="People directory"
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-[64px] rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      }
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 flex-1 max-w-md rounded-md" />
          <Skeleton className="h-9 w-[120px] rounded-md" />
        </div>
      }
    >
      <DataTableSkeleton rows={12} columns={7} className="flex-1" />
    </PageWrapper>
  );
}
