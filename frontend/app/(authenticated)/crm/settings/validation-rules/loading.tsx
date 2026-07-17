import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function ValidationRulesLoading() {
  return (
    <PageWrapper
      title="Validation Rules"
      subtitle="Define field validation for CRM entities"
      actions={<Skeleton className="h-9 w-24 rounded-md" />}
    >
      <div className="space-y-4">
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-20 rounded-md" />
          ))}
        </div>
        <DataTableSkeleton rows={12} columns={6} />
        <div className="bg-card rounded-lg border border-border shadow-sm p-4 space-y-3">
          <Skeleton className="h-4 w-36" />
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1 rounded-md" />
            <Skeleton className="h-9 flex-1 rounded-md" />
            <Skeleton className="h-9 w-16 rounded-md" />
          </div>
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>
    </PageWrapper>
  );
}
