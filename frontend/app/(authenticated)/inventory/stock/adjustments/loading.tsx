import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function AdjustmentsLoading() {
  return (
    <PageWrapper eyebrow="Inventory · Stock" title="Adjustments" subtitle="Stock quantity adjustments.">
      <div className="space-y-3">
        <Skeleton className="h-8 w-full max-w-sm rounded-md" />
        <div className="space-y-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
