import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function BarcodeLoading() {
  return (
    <PageWrapper
      eyebrow="Operations · Inventory"
      title="Barcode Lookup"
      subtitle="Scan or enter a barcode to look up inventory items."
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    </PageWrapper>
  );
}
