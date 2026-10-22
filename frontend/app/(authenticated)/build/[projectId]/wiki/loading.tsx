import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function WikiLoading() {
  return (
    <PageWrapper title="">
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={String(i)} className="h-[72px] rounded-lg" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
