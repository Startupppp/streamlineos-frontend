import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export function SelfServiceHubSkeleton({ title = "My work", navigation = true }: { title?: string; navigation?: boolean }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3" role="status" aria-label={`Loading ${title}`}>
      {navigation ? (
        <div className="flex min-w-0 gap-2 overflow-hidden border-b border-border px-4 py-3 sm:px-6">
          <Skeleton className="h-9 w-28 shrink-0 rounded-md" />
          <Skeleton className="h-9 w-28 shrink-0 rounded-md" />
          <Skeleton className="hidden h-9 w-28 shrink-0 rounded-md sm:block" />
        </div>
      ) : null}
      <PageWrapper title={title} subtitle="Loading your information…">
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-12 rounded-lg" />
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-16 rounded-lg" />
            ))}
          </div>
        </div>
      </PageWrapper>
    </div>
  );
}
