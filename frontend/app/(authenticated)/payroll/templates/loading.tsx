import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export function TemplatesPageSkeleton() {
  return (
    <PageWrapper title="Template Library" subtitle="Loading…">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-start justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <div className="flex gap-1">
              <Skeleton className="h-5 w-12 rounded" />
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="h-5 w-14 rounded" />
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}

export default function Loading() {
  return <TemplatesPageSkeleton />;
}
