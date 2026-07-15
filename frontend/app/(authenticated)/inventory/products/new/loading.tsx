import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function NewProductLoading() {
  return (
    <PageWrapper
      title="New Product"
      subtitle="Add a new product to your catalogue."
    >
      <div className="space-y-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </PageWrapper>
  );
}
