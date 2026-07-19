import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export function BonusesPageSkeleton() {
  return (
    <PageWrapper title="Bonuses & Incentives" subtitle="Manage variable pay and sales commissions.">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <div className="flex gap-1">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-2.5 flex gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-20" />
            ))}
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-4 py-3 items-center">
                <Skeleton className="h-4 w-28 flex-1" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

export default function Loading() {
  return <BonusesPageSkeleton />;
}
