import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export function BonusesPageSkeleton() {
  return (
    <PageWrapper title="Bonuses & Incentives" eyebrow="Payroll" subtitle="Loading…">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-full rounded-lg" />
        <div className="flex gap-1">
          <Skeleton className="h-7 w-20 rounded-md" />
          <Skeleton className="h-7 w-24 rounded-md" />
        </div>
        <div className="rounded-md border border-border overflow-hidden">
          <div className="border-b border-border px-2 py-1.5 bg-muted/50 flex gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-20" />
            ))}
          </div>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex gap-4 px-2 py-2 border-b border-border last:border-0">
              <Skeleton className="h-3 w-28 flex-1" />
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24 flex-1" />
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}

export default function Loading() {
  return <BonusesPageSkeleton />;
}
