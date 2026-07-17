import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function ClientDetailLoading() {
  return (
    <PageWrapper title="Client" subtitle="Loading...">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-md" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <Skeleton className="h-52" />
            <Skeleton className="h-44" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-52" />
            <Skeleton className="h-44" />
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
