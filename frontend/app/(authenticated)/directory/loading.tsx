import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { DIRECTORY_SUBTITLE, DIRECTORY_TITLE, PERSON_TABLE_HEADERS } from "@/features/directory/people/person-table-headers";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function DirectoryLoading() {
  return (
    <PageWrapper
      title={DIRECTORY_TITLE}
      subtitle={DIRECTORY_SUBTITLE}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 min-w-0 flex-1 rounded-md sm:min-w-[12rem]" />
        </div>
      }
      actions={<Skeleton className="h-9 w-24 max-w-full rounded-md sm:w-28" />}
    >
      <DataTableSkeleton
        rows={12}
        headers={PERSON_TABLE_HEADERS}
        mobileCards
        className="min-w-0"
      />
    </PageWrapper>
  );
}
