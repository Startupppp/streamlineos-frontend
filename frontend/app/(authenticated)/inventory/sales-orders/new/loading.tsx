import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewSalesOrderLoading() {
  return (
    <PageWrapper eyebrow="Inventory · Sales Orders" title="New Sales Order">
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <Skeleton className="h-4 w-32" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <Skeleton className="h-4 w-20" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-9" />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
    </PageWrapper>
  );
}
