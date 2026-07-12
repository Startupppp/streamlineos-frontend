import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function StockLoading() {
  return (
    <PageWrapper eyebrow="Inventory" title="Stock" subtitle="Live stock levels across all warehouses.">
      <div className="space-y-3">
        <Skeleton className="h-8 w-full max-w-sm rounded-md" />
        <div className="space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
