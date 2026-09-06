import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export function ReimbursementsPageSkeleton() {
  return (
    <PageWrapper
      title="Reimbursements"
      subtitle="Review and approve employee expense claims."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-44 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-44 rounded-md" />
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-3">
        <Skeleton className="h-9 w-full rounded-lg shrink-0" />
        <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
          <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
            <DataTableSkeleton rows={12} columns={7} />
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}

export default function Loading() {
  return <ReimbursementsPageSkeleton />;
}
