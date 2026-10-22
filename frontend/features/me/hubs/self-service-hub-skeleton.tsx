import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export function SelfServiceHubSkeleton({ title = "My work" }: { title?: string }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col" role="status" aria-label={`Loading ${title}`}>
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
