import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

interface OrgHierarchyListSkeletonProps {
  title: string;
  subtitle: string;
  columnCount: number;
  actionLabel: string;
}

export function OrgHierarchyListSkeleton({
  title,
  subtitle,
  columnCount,
  actionLabel,
}: OrgHierarchyListSkeletonProps) {
  const actionWidth =
    actionLabel.length > 16 ? "w-36" : actionLabel.length > 12 ? "w-32" : "w-28";

  return (
    <PageWrapper
      title={title}
      subtitle={subtitle}
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
      actions={
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Skeleton className="h-9 w-28" />
          <Skeleton className={`h-9 ${actionWidth}`} title={actionLabel} />
        </div>
      }
      filters={<Skeleton className="h-9 w-full max-w-[320px]" />}
    >
      <DataTableSkeleton
        rows={12}
        columns={columnCount}
        className="min-h-0 flex-1"
      />
    </PageWrapper>
  );
}
