import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function ProductDetailLoading() {
  return (
    <PageWrapper
      title="Product"
      actions={<Skeleton className="h-4 w-20 rounded-md" />}
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-4 w-16 rounded-md" />{" "}
          <Skeleton className="h-4 w-20 rounded-md" />{" "}
          <Skeleton className="h-8 w-14 rounded-md" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </PageWrapper>
  );
}
