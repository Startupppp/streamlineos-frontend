import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function InvoicesLoading() {
  return (
    <PageWrapper
      title="Invoices"
      subtitle="Manage and track all invoices"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
      filters={<Skeleton className="h-9 w-40 rounded-md" />}
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        <DataTableSkeleton rows={12} columns={7} />
      </div>
    </PageWrapper>
  );
}
