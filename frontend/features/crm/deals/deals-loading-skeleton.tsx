"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export function DealsLoadingSkeleton() {
  return (
    <PageWrapper title="Deals Pipeline">
      <div className="space-y-4">
        <div className="flex gap-2 overflow-x-auto sm:grid sm:grid-cols-4 sm:overflow-visible">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 min-w-[150px] shrink-0 sm:min-w-0"
            >
              <Skeleton className="h-8 w-8 rounded-md shrink-0" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-14" />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-md border border-border">
          <div className="border-b border-border px-2 py-1.5 flex gap-4 bg-muted/80">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-3 flex-1" />)}
          </div>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <div key={i} className="h-8 flex gap-4 px-2 py-1 border-b border-border last:border-0">
              {[1, 2, 3, 4, 5].map((j) => <Skeleton key={j} className="h-3 flex-1" />)}
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
