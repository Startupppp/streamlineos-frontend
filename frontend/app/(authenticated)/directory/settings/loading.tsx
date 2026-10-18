import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { DIRECTORY_SUBTITLE, DIRECTORY_TITLE } from "@/features/directory/people/person-table-headers";

export default function DirectorySettingsLoading() {
  return (
    <PageWrapper
      title={DIRECTORY_TITLE}
      subtitle={DIRECTORY_SUBTITLE}
      filters={<Skeleton className="h-9 w-full max-w-sm" />}
      actions={<Skeleton className="h-9 w-28" />}
      noInternalScroll
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <DataTableSkeleton rows={12} columns={6} className="flex-1" />
      </div>
    </PageWrapper>
  );
}
