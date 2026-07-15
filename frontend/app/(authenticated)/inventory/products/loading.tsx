import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function ProductsLoading() {
  return (
    <PageWrapper title="Products" subtitle="Your product catalogue.">
      <div className="space-y-3">
        <Skeleton className="h-8 w-full max-w-sm rounded-md" />
        <div className="space-y-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
