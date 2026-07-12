import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function HoldsLoading() {
  return (
    <PageWrapper
      eyebrow="Inventory · Quality"
      title="Quality Holds"
      subtitle="Manage inventory quality holds"
      actions={<Skeleton className="h-8 w-28 rounded-md" />}
      filters={
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-44 rounded-md" />
        </div>
      }
    >
      <div className="space-y-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded" />
        ))}
      </div>
    </PageWrapper>
  );
}
