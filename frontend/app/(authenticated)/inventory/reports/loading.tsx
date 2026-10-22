import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

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
