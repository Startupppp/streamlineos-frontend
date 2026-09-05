import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Three tabs and the anomaly queue behind the first of them, which is what the
 * page opens on. The queue's own in-panel skeleton is three `h-24` cards, so the
 * segment fallback shows the same shape rather than a different one that then
 * swaps — a skeleton that does not match its successor reads as a layout jump.
 */
export default function InventoryAiLoading() {
  return (
    <PageWrapper
      title="Inventory AI"
      subtitle="Every figure on these screens is computed by the inventory engine. The model narrates and selects; it never supplies a number and never writes stock."
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <Skeleton className="h-9 w-72 shrink-0 rounded-lg" />
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
