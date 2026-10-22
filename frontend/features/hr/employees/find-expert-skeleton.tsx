import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

const EXPERT_CARD_KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function FindExpertSkeleton() {
  return (
    <PageWrapper
      title="Find Expert"
      subtitle="Search across the org to find colleagues with specific skills"
    >
      <div className="flex shrink-0 flex-col gap-3">
        <div className="flex gap-2 max-w-lg">
          <Skeleton className="h-9 flex-1 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <Skeleton className="h-9 w-40 rounded-md shrink-0" />
          <Skeleton className="h-9 w-36 rounded-md shrink-0" />
        </div>
      </div>
      <div className="grid gap-3 mt-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {EXPERT_CARD_KEYS.map((key) => (
          <div key={key} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
