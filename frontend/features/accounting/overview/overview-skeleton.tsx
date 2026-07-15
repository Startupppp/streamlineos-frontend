"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card px-3 py-2.5 flex items-center gap-2.5">
            <Skeleton className="h-8 w-8 rounded-md shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-3 flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-md shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <Skeleton className="h-4 w-48 mb-4" />
          <Skeleton className="h-[240px] w-full" />
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <Skeleton className="h-4 w-32 mb-3" />
            <div className="space-y-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-7 w-7 rounded-md" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-[68px] w-full rounded-xl" />
            <Skeleton className="h-[68px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
