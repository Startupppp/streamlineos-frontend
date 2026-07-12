import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function VendorsLoading() {
  return (
    <PageWrapper eyebrow="Inventory" title="Vendors" subtitle="Manage your suppliers and purchase order vendors.">
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
