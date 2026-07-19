import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function BarcodeLoading() {
  return (
    <PageWrapper
      title="Barcode Lookup"
      subtitle="Scan or enter a barcode to look up inventory items."
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-24" />
        </div>
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    </PageWrapper>
  );
}
