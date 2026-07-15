import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function AllWorkLoading() {
  return (
    <PageWrapper title="All Work">
      <div className="space-y-1.5 px-4 pb-4">
        <Skeleton className="h-8 w-full rounded" />
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded" />
        ))}
      </div>
    </PageWrapper>
  );
}
