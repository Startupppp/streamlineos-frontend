import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function SalesOrderDetailLoading() {
  return (
    <PageWrapper
      eyebrow="Inventory · Sales Orders"
      title="Sales Order"
      backHref="/inventory/sales-orders"
      actions={
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-28" />
            </div>
          ))}
        </div>
        <div className="rounded-md border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-muted/80 px-3 py-2 flex gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-20" />
            ))}
          </div>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="border-b border-border/50 px-3 py-2 flex gap-4">
              {Array.from({ length: 12 }).map((__, j) => (
                <Skeleton key={j} className="h-3 w-20" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
