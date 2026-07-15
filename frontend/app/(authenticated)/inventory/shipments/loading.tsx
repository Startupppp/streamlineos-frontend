import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function ShipmentsLoading() {
  return (
    <PageWrapper
      title="Shipments"
      subtitle="Track and manage outbound shipments"
      actions={<Skeleton className="h-8 w-32 rounded-md" />}
      filters={
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-44 rounded-md" />
        </div>
      }
    >
      <div className="space-y-1">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full rounded" />
        ))}
      </div>
    </PageWrapper>
  );
}
