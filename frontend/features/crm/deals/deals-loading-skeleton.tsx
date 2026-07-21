"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export function DealsLoadingSkeleton() {
  return (
    <PageWrapper title="Deals Pipeline">
      <div className="space-y-4">
        <StatCardGridSkeleton cols={4} count={4} />
        <div className="rounded-md border border-border">
          <div className="border-b border-border px-2 py-1.5 flex gap-4 bg-muted/80">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-3 flex-1" />)}
          </div>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <div key={i} className="flex gap-4 px-2 py-1 border-b border-border last:border-0">
              {[1, 2, 3, 4, 5].map((j) => <Skeleton key={j} className="h-3 flex-1" />)}
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
