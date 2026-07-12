import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function PurchaseOrdersLoading() {
  return (
    <PageWrapper
      eyebrow="Inventory"
      title="Purchase Orders"
      actions={<Skeleton className="h-8 w-20" />}
      filters={
        <div className="flex gap-2">
          <Skeleton className="h-8 flex-1 max-w-md" />
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-36" />
        </div>
      }
    >
      <div className="rounded-md border border-border bg-card overflow-hidden min-h-[320px]">
        <div className="border-b border-border bg-muted/80 px-3 py-2 flex gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-20" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b border-border/50 px-3 py-2 flex gap-4">
            {Array.from({ length: 7 }).map((__, j) => (
              <Skeleton key={j} className="h-3 w-20" />
            ))}
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
