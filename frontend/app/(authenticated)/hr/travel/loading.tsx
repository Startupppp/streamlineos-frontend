import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

const CARD_ROWS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

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
          {CARD_ROWS.map((n) => (
            <Skeleton key={n} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
