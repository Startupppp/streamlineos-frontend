import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function RunExecutionLoading() {
  return (
    <PageWrapper title="Loading run..." backHref="#">
      <div className="px-4 pb-4 space-y-2">
        <Skeleton className="h-4 w-48 rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    </PageWrapper>
  );
}
