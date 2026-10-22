import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function CompOffLoading() {
  return (
    <PageWrapper
      title="Compensatory Off"
      subtitle="Track earned comp-off from overtime work"
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <Skeleton className="h-40 rounded-2xl" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
