import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { DataTableSkeleton } from "@/components/ui/data-table";

export function LoansPageSkeleton() {
  return (
    <PageWrapper title="Loans & Advances" subtitle="Manage employee salary advances and loan EMI recovery.">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-9 w-44 rounded-md" />
      </div>
      <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
        <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
          <DataTableSkeleton rows={12} columns={6} />
        </CardContent>
      </Card>
    </PageWrapper>
  );
}

export default function Loading() {
  return <LoansPageSkeleton />;
}
