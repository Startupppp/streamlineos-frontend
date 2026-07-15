import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewSalesOrderLoading() {
  return (
    <PageWrapper title="New Sales Order">
      <div className="space-y-1">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full rounded" />
        ))}
      </div>
    </PageWrapper>
  );
}
