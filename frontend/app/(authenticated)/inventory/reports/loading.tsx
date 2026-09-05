import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The hub's own first paint: the same three-column card grid, at the same card
 * height, so the grid does not reflow when `/me/access` lands and the cards the
 * reader may actually open replace the placeholders.
 *
 * Seven, because seven is what the navigation model declares today and the hub
 * renders one card per report. It is a fallback, not a promise: a reader with
 * fewer permissions gets fewer cards a moment later.
 */
export default function InventoryReportsLoading() {
  return (
    <PageWrapper
      title="Reports"
      subtitle="Inventory reporting — stock, movement, exposure and service level"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </PageWrapper>
  );
}
