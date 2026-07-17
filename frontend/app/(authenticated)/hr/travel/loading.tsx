import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function TravelLoading() {
  return (
    <PageWrapper
      title="Travel Requests"
      subtitle="Plan and track your business travel"
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
    >
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
