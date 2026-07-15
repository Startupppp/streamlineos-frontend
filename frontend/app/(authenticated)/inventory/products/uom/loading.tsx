import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function UomLoading() {
  return (
    <PageWrapper eyebrow="Inventory · Products" title="Units of Measure" subtitle="Define units used across product catalogues and transactions.">
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-lg" />
        <div className="space-y-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
