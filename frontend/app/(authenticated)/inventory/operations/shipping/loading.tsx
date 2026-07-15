import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function ShippingQueueLoading() {
  return (
    <PageWrapper
      title="Shipping"
      filters={<Skeleton className="h-8 w-64" />}
    >
      <div className="rounded-md border border-border bg-card overflow-hidden min-h-[320px]">
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
