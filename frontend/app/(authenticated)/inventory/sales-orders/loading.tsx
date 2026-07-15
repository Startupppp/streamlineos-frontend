import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function SalesOrdersLoading() {
  return (
    <PageWrapper
      eyebrow="Inventory"
      title="Sales Orders"
      subtitle="Manage customer sales orders from creation to invoicing."
      actions={<Skeleton className="h-9 w-20" />}
      filters={
        <div className="flex gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-36" />
        </div>
      }
    >
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
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
    </PageWrapper>
  );
}
