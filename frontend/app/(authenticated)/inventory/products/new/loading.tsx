import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewProductLoading() {
  return (
    <PageWrapper
      title="New Product"
      subtitle="Add a new product to your catalogue."
      actions={<Skeleton className="h-9 w-36" />}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </PageWrapper>
  );
}
