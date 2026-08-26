import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function ContactsLoading() {
  return (
    <PageWrapper
      title="Contacts"
      subtitle="The people you deal with at each company"
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      }
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 max-w-md flex-1 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="ml-auto h-9 w-24 rounded-md" />
        </div>
      }
    >
      <DataTableSkeleton rows={12} columns={6} className="flex-1" />
    </PageWrapper>
  );
}
