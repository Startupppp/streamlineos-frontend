import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function LoadsLoading() {
  return (
    <PageWrapper
      eyebrow="Inventory · Shipping"
      title="Loads"
      subtitle="Group shipments into transport loads"
      actions={<Skeleton className="h-8 w-24 rounded-md" />}
    >
      <div className="space-y-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded" />
        ))}
      </div>
    </PageWrapper>
  );
}
